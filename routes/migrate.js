var express = require('express');
var router = express.Router();
var fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
var path = require('path');
var bd=require('./bd');
var bdeltiempo=require('./bd_eltiempo');
var Client = require('ssh2-sftp-client');

const config = {
  host: '127.0.0.1',
  port:'22',
  username: 'berneytest',
  password: '123456789'
};
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

async function obtainData() {
  bd.query('select uid,email,first_name,last_name from users limit 100', function(error,filas){
        if (error) {            
            console.log('error en el listado');
            return res.send({msg:"error consulta"});
        }    
       return filas;
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

router.get('/generate-csv/:termid',function(req,res,next){
  bd.query('select uid,email,first_name,last_name from users limit 100', function(error,filas){
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
      
      const csvUser=generateCsv('userFile-'+new Date().getTime()+'.csv',info,headerUserFile);
      const csvTerm=generateCsv('TermFile-'+new Date().getTime()+'.csv',info,headerTermFile);
      sentSFTP(csvUser.name);
      sentSFTP(csvTerm.name);
      
      res.send({
        msg:"Archivos csv transferidos",
        file:[
          (csvUser.name)?csvUser:'Error a crear archivo de user_file',
          (csvTerm.name)?csvTerm:'Error a crear archivo de term_file',
        ]}
      )
  });
})

function sentSFTP(name){
  let data = fs.createReadStream('csv/'+name);
  let remote = '/'+name;
  let status;
  sftp.connect(config)
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
    return status
  })
  .catch(err => {
    status={
      msg:err,
      sftp:false
    };
    console.log(status)
    return status
  });
  return status;
};

module.exports = router;
