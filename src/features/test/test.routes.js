routes.$inject = ['$stateProvider'];

export default function routes($stateProvider) {
  $stateProvider
    .state('test', {
      url: '/test',
      template: require("./test.html")
    });
};
