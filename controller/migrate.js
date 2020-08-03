var fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
var path = require('path');
var bd=require('../bd/bd_casper');
var bdeltiempo=require('../bd/bd_eltiempo');
var Client = require('ssh2-sftp-client');
const config = require('../config/sftp.config.json');

const sftp = new Client('smtp-berney');

const headerUserFile=[
  {id:"uid",title:"user_id"},
  {id:"email",title:"email"},
  {id:"first_name",title:"first_name"},
  {id:"last_name",title:"last_name"},
  {id:"password",title:"password"},
  {id:"social_accounts",title:"social_accounts"}
]
const headerTermFile=[
  {id:"uid",title:"user_id"},
  {id:"term_id",title:"term_id"},
  {id:"access_end_date",title:"access_end_date"},
  {id:"unlimited_access",title:"unlimited_access"}
]
const infoEmpty={
  uid:"",email:"",first_name:"",last_name:"",password:"",social_accounts:"",term_id:"",access_end_date:"",unlimited_access:""
}

/** Agregar parametro opcional consulta por fech y hora */
function migrate(req,res){
    console.log(req.params.fecha);
    let query = "select uid,email,first_name,last_name from users";
    if(typeof req.params.fecha !== "undefined"){
        let fecha =req.params.fecha;
        let newFecha =fecha.split("|");
        if(newFecha.length > 1){
            let date =newFecha[0];
            let hora =newFecha[1].replace(/-/gi,":");
            date +=" "+hora;
            if (new Date(date).toString() !== 'Invalid Date') {
                query +=" where register_date > '"+date+"'";
            }
            else{
                res.send({
                    status: 'error',
                    code: 404,
                    msg: 'Invalid Date'
                })
            }
        }
        else{
            res.send({
                status: 'error',
                code: 404,
                msg: 'Invalid Date'
            })
        }

    }
    bd.query(query, async function(error,filas){
        if (error) {            
            console.log('error en el listado');
            return res.send({msg:"error consulta"});
        } 
        const info=[];   
        filas.forEach(element => {
            element.password=":UNKNOWN:::0";
            element.social_accounts="";
            element.access_end_date="";
            element.unlimited_access=true;
            element.term_id=req.params.termid;
            info.push(element);
        });
        info.push(infoEmpty);
        const csvUser=generateCsv('userFile-'+new Date().getTime()+'.csv',info,headerUserFile);
        const csvTerm=generateCsv('TermFile-'+new Date().getTime()+'.csv',info,headerTermFile);
        const sftpUser= await sentSFTP(csvUser.name);
        const sftpTerm=await sentSFTP(csvTerm.name);
        csvUser.sftp=sftpUser.sftp;
        csvTerm.sftp=sftpTerm.sftp;
  
        res.send({
          msg:"Archivos csv transferidos",
          file:[
            (csvUser.name)?csvUser:'Error a crear archivo de user_file',
            (csvTerm.name)?csvTerm:'Error a crear archivo de term_file',
          ]}
        )
    });
}

function generateCsv(namecsv,datacsv,headercsv){
    const csvWriter = createCsvWriter({
      path: 'csv/'+namecsv,
      fieldDelimiter:";",
      encoding:'utf8',
      header: headercsv
    });
    const data = (datacsv)?datacsv:[];
    csvWriter
      .writeRecords(data)
      .then(()=>{return true})
      const registro={
        date_in: new Date(),
        name_file:namecsv,
        sent_ftp:false
      }
      bdeltiempo.query('insert into migrate_audit set ?',registro, (error,resultado) => {
        if (error) {
          console.log(error);
          return;
        }	  
      });
    return {name:namecsv}
}

function sentSFTP(name){
    let data = fs.createReadStream('csv/'+name);
    let remote = '/'+name;
    let status;
    return new Promise((fulfill,error)=>sftp.connect(config)
    .then(() => {
      return sftp.put(data, remote);
    })
    .then(() => {
      const registro={
        sent_ftp:true
      }
      bdeltiempo.query('UPDATE migrate_audit SET ? WHERE ?',[registro,{name_file:name}], (error,resultado) => {
        if (error) {
          console.log(error);
          return;
        }	  
      });
      sftp.end();
      status={sftp:true}
      console.log(status)
      fulfill(status)
    })
    .catch(err => {
      status={
        msg:err,
        sftp:false
      };
      console.log("++++++++++++  error conexion  ++++++++++++++++++++")
      console.log(status)
      fulfill(status);
    }));
    // return status;
};

module.exports={
    migrate
}