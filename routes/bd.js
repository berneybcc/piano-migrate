var mysql=require('mysql');

var conexion=mysql.createConnection({
    host:'127.0.0.1',
    user:'root',
    password:'toor',
    database:'casper'
});

conexion.connect(function (error){
    if (error)
    {   console.log(error);
        console.log('Problemas de conexion con mysql');
    }
    else
        console.log('se inicio conexion');
});


module.exports=conexion;