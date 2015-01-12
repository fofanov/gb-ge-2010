var westminsterApp = angular.module('westminsterApp', [
    'ngRoute',
    'ui.bootstrap',
    'westminsterControllers'
]);

westminsterApp.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider.
            when('/map', {
                templateUrl: 'app/partials/map.html',
                controller:  'MapCtrl'
            }).
            when('/about', {
               templateUrl: 'app/partials/about.html'
            }).
            otherwise({
                redirectTo: '/map'
            });

        $locationProvider.html5Mode(true);
        }]);
