import angular from 'angular';
import uirouter from 'angular-ui-router';

import routing from './test.routes';
import TestController from './test.controller';
import TestService from "TestService";
import ngCookies from "angular-cookies";
import '../../directives/timer/angular-timer.min.js';
export default angular.module('app.test', [uirouter,TestService,ngCookies,'timer'])
  .config(routing)
  .controller('TestController', TestController)
  .name;
