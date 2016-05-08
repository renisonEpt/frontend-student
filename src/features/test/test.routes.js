routes.$inject = ['$stateProvider'];

export default function routes($stateProvider) {
  $stateProvider
    .state('test', {
      url: '/test',
      template: require('./test.html')
    })
    .state('testEnd',{
    	url:'/test-end',
    	template:require('./test-end.html')
    });
};
