<?php

require_once __DIR__ . '/../../../tests/bootstrap.php';

// \OC::$composerAutoloader->addPsr4('OCA\\NMCsharing\\Tests\\', dirname(__FILE__) . '/unit/', true);
\OC_App::loadApp('nmcsharing');
OC_Hook::clear();
