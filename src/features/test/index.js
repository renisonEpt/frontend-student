import angular from 'angular';
import uirouter from 'angular-ui-router';
import 'angular-local-storage';
import routing from './test.routes';
import TestController from './test.controller';
import ngCookies from "angular-cookies";
import '../../directives/timer/angular-timer.min.js';
export default angular.module('app.test', [uirouter,ngCookies,'timer','LocalStorageModule'])
  .config(routing)
  .controller('TestController', TestController)
  .name;
