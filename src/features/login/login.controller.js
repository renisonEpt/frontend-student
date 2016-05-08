import "angular-local-storage";
import {TestServiceName} from "TestService";
LoginController.$inject  = ["$rootScope",'$scope', TestServiceName,"$stateParams", "$state","$q","localStorageService","BaseService","$cookies"];

export default function LoginController($rootScope,$scope, TestService,$stateParams,$state,$q,localStorageService,BaseService,$cookies) {
    $scope.user = {
        firstName:"",
        lastName:"",
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
        BaseService.post("/login",user).then(function(data){ 
            console.log("service trying to login, below is the data got from server");
            console.log(data);
            $scope.loaded=true;
            $cookies.put("loginToken",data.jwt,{
                expires:new Date(Date.now() + 120*60*1000) //expires in 120 minutes
            });
            $state.go("test");
        }).catch(function(response){
            console.log(response);
            alert("login failed");
        });
    };

    $scope.expressLogin=function(){
        $scope.login({"firstName":"asdfads","lastName":"test ","studentId":123,"dateOfBirth":"2003-03-12","gender":"MALE","email":"1231231@ccc.com","university":"University of Hong Kong","currentMajor":"hello","UWMajor":"","faculty":"","password":"1234"});
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