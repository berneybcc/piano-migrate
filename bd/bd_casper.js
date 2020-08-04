var mysql=require('mysql');
var { HOST_DB,USER_DB,PASS_DB,PORT_DB } = require('../config');

var conexion=mysql.createConnection({
    host:HOST_DB,
    user:USER_DB,
    password:PASS_DB,
    port:PORT_DB,
    database:'casper'
});

conexion.connect(function (error){
    if (error)
    {   console.log(error);
        console.log('Problemas de conexion con mysql');
    }
    else
        console.log('Se inicio conexion Casper');
});


module.exports=conexion;