import 'bootstrap/dist/css/bootstrap.css';
import angular from 'angular';
import uirouter from 'angular-ui-router'; // by  default importing angular-ui-router would not 
// return an object, but would rather return the name of the module 'ui.router'
// so that we can directly include it in angular.module

import routing from './app.config';
import core from "renison-ept-frontend-core";
import login from 'login';
import test from 'test';
var app = angular.module('app', [uirouter, core,login,test])
  .config(routing)
  .factory('$exceptionHandler', function() {
    return function(exception, cause) {
      exception.message += ' (caused by "' + cause + '")';
      console.log('I caught exception', exception.message);
      throw exception;
    };
  });
