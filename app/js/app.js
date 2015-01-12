var westminsterApp = angular.module('westminsterApp', [
    'ngRoute',
    'ui.bootstrap',
    'westminsterControllers'
]);

westminsterApp.config(['$routeProvider',
    function($routeProvider) {
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

        }]);
