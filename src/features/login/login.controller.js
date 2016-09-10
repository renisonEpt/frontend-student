import 'angular-local-storage';
require('./login.less');
LoginController.$inject  = ['$rootScope','$scope',
    '$stateParams', '$state','$q','localStorageService',
    'BaseService','$cookies','BaseModalService','BaseToastService','$interval'];
var LOGIN_ATTEMPT_INTERVAL = 5000; // send login attempt every 5 seconds
export default function LoginController($rootScope,$scope, 
    $stateParams,$state,$q,localStorageService,
    BaseService,$cookies,BaseModalService,BaseToastService,$interval) {

    $scope.user = {
        firstName:'',
        lastName:'',
        studentID:'',
        dateOfBirth:'',
        gender:'',
        email:'',
        university:'',
        currentMajor:'',
        UWMajor:'',
        faculty:'',
        password:'',
    };
    var loginPolling = null;
    $scope.loaded=true;
    $scope.loginStaging = false;
    function cancelLoading(){
        $scope.loaded = true;
    }
    //TODO validate information before sending to our backend
    var startTest = function (user) {
        $scope.loaded=false;
        return BaseService.post('/login',user);
    };
    function cancelPolling(){
        if(loginPolling){
            $interval.cancel(loginPolling);
            loginPolling = null;
        }
    }
    // first, we put user into login-staging, where we repeatedly
    // send request to server and ask for login
    // if the server says test has not started yet, we continue to try
    // if server says error, we prompt the user for correcting the mistakes
    // if all goes well, user will start test immediately once instructor
    // activates the test
    $scope.login = function(user){
        user = user || $scope.user;
        $scope.loginStaging = true;
        loginPolling = $interval(function(){
            startTest(user).then(function(data){ 
                console.log('service trying to login, below is the data got from server');
                console.log(data);
                cancelLoading();
                $cookies.put('loginToken',data.jwt,{
                    expires:new Date(Date.now() + 300*60*1000) //expires in 300 minutes
                });
                cancelPolling();
                $state.go('test');
            });
        },LOGIN_ATTEMPT_INTERVAL);
    };
    $scope.resetLogin = function(){
        cancelPolling();
        $scope.loginStaging = false;
        $scope.loaded=true;
    };
    $scope.expressLogin=function(){
        $scope.login({'firstName':'asdfads','lastName':'test ','studentId':123,'dateOfBirth':'2003-03-12','gender':'MALE','email':'1231231@ccc.com','university':'University of Hong Kong','currentMajor':'hello','UWMajor':'','faculty':'','password':'1234'});
    };
}