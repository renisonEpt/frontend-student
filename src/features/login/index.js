import angular from 'angular';
import uirouter from 'angular-ui-router';

import routing from './login.routes';
import LoginController from './login.controller';
import TestService from "TestService";
export default angular.module('app.basic-test', [uirouter,TestService])
  .config(routing)
  .controller('LoginController', LoginController)
  .name;
