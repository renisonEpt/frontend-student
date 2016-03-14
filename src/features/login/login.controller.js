import "angular-local-storage";
import {TestServiceName} from "TestService";
LoginController.$inject  = ["$rootScope",'$scope', TestServiceName,"$stateParams", "$state","$q","localStorageService"];

export default function LoginController($rootScope,$scope, TestService,$stateParams,$state,$q,localStorageService) {
    $scope.user = {
        surname:"",
        givenName:"",
        studentID:"",
        dateOfBirth:"",
        gender:"",
        email:"",
        university:"",
        currentMajor:"",
        UWMajor:"",
        faculty:"",
        password:"",
    };
        if(TestService.urlParams['previewID']){
            $state.go('test');
        }
    $scope.loaded=true;
    //TODO validate information before sending to our backend
    $scope.login = function (user) {
        $scope.loaded=false;
        user = user || $scope.user;
        var onSuccess = function (data) {
            $scope.loaded=true;
            $state.go('test');
        };
        var onError = function (data) {
            $scope.loaded=true;
            alert("login unsuccessful, please try again");
            console.log(data);
        };
        TestService.studentLogin(user, onSuccess, onError);
    };
        $scope.expressLogin=function(){
            $scope.login({"surname":"asdfads","givenName":"test " + Math.random(9999),"studentID":123,"dateOfBirth":"1234-03-12T08:00:00.000Z","gender":"Male","email":"1231231@ccc.com","university":"University of Hong Kong","currentMajor":"hello","UWMajor":"","faculty":"","password":"1234"});
        };

        $scope.recoverTest = function(){
            var password = prompt("please enter your recovery code");
            if(password && password.length>=4){
                if(password.substring(password.length-3,password.length) == "ept"){
                    TestService.sessionID = parseInt(password.substring(0,password.length-3));
                    console.log(TestService.sessionID);
                    TestService.isLoggedIn = true;
                    console.log("recovered");
                    $state.go('test');
                }
                //console.log(password.substring(password.length-3,password.length));
            }else{
                alert("recovery failed");
            }
        };
}