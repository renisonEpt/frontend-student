import angular from 'angular';
import uirouter from 'angular-ui-router';

import routing from './login.routes';
import LoginController from './login.controller';
import TestService from "TestService";
import ngCookies from "angular-cookies"
export default angular.module('app.login', [uirouter,TestService,ngCookies])
  .config(routing)
  .controller('LoginController', LoginController)
  .name;
