var express = require('express');
var router = express.Router();
var MigrateController = require('../controller/migrate')

router.get('/generate-csv/:termid/:fecha?',MigrateController.migrate)

module.exports = router;
