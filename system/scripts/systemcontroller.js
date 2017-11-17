var systemApp = angular.module("systemApp",[]);

systemApp.controller('SystemCtrl',['$scope', '$http', 'SOAPFactory', function ($scope, $http, SOAPFactory) {
    
//  Set all variables used by the controller.
   
   $scope.datetime = {};
   $scope.database = [];
   $scope.system = [];
   $scope.services = [];
   $scope.customer = {};
   $scope.boporg = {};
   $scope.hname = {};
   $scope.orgcontainers=[];
   $scope.baseurl = window.location.protocol + "//" + window.location.hostname;
   $scope.formData = {};
   $scope.alerts = [];
   $scope.utilization = {};
   $scope.dblogs = [];
   
// Read all files and settings to be loaded only once.
   
   $http.get('system/reports/CustomerName.json').success(function(data) {
       $scope.customer = data;
   });
   
   $http.get('system/reports/Hostname.json').success(function(data) {
       $scope.hname = data;
   });
   
   $http.get('system/reports/DbLogs.json').success(function(data) {
       $scope.dblogs = "";
       data.forEach(
               function (entry){
                  $scope.dblogs+=entry.logentry;
                  $scope.dblogs+= "\n\n";
                }
       );
   });
   
// Set the classes for conditional formatting purposes.   
   
   $scope.getDiskClass = function(disk) {
       if ( disk <= 10) { return 'danger'} else
           if (disk <= 25) { return 'info'}
   };
   
   $scope.getServicesClass = function(service) {
       if ( service == "Stopped") { return 'danger'} else
           if (service == "Starting") { return 'info'}
   };
   
// This factory determines the default organization and calls the Web Service to create a list of all organizations.
   
   $http.get('system/reports/DefaultOrg.json').success(function(data) {
       $scope.boporg=data;
       $scope.formData.selectedItem = $scope.boporg.description;
       $scope.selectedOrg = $scope.boporg.description;
       var splitarray = $scope.boporg.dn.split(",");
       var newarray = splitarray.splice(1,3);
       var newstring = newarray.join();
       SOAPFactory.getOrganizations(newstring,$scope.fetchOrganizations);
   });  
   
 //This function gets triggered when the drop down box is used to select another organization. It will then request all Soap Containers for this organization from BOP and update the table.
   
   $scope.ChangeSoap=function () {
       $scope.orgcontainers=[];
       if ($scope.organizations) {
       if ($scope.formData.selectedItem != "All") {
           for (s = 0; s < $scope.organizations.length; s++)
           {
               if ($scope.organizations[s].description == $scope.formData.selectedItem) {
                   $scope.boporg.dn=$scope.organizations[s].dn;
                   SOAPFactory.getSoapProcessors($scope.boporg.dn,$scope.fetchSoapProcessors);
                   };
           };
       } else {
           for (u = 0; u < $scope.organizations.length; u++)
           {
               $scope.boporg.dn=$scope.organizations[u].dn;
               SOAPFactory.getSoapProcessors($scope.boporg.dn,$scope.fetchSoapProcessors);
           };
       };
       };
   };
     
//  Function to periodically load information based on SetInterval.   
   
   function GetSystemStatusBackground() {
      GetSystemStatus();
      $scope.$apply();
   };
   
// Function to read all files and settings periodically.
   
   function GetSystemStatus() {
       $http.get('system/reports/DateTimeRpt.json').success(function(data) {
           $scope.datetime = data;
       });
       $http.get('system/reports/DBSpaceRpt.json').success(function(data) {
           $scope.database = data;
       });
       $http.get('system/reports/DiskSpaceRpt.json').success(function(data) {
           $scope.system = data;
       });
       $http.get('system/reports/Services.json').success(function(data) {
           $scope.services = data;
       });
       $http.get('system/reports/AlertRpt.json').success(function(data) {
           $scope.alerts = data;
       });
       $http.get('system/reports/Utilization.json').success(function(data) {
           $scope.utilization = data;
       });
       $scope.ChangeSoap();
   };
   
// Call to read files and settings, and execute the same function periodically.   
   
   GetSystemStatus();
   var GetSystemStatusStart = setInterval(GetSystemStatusBackground, 150000);
    
//This section fetches the drop down box for the organizations.
   
   $scope.fetchOrganizations= function(data){
       var allOrg= [{description : 'All'}];
       $scope.organizations=SOAPFactory.parseOrganizations(data);
       $scope.displayOrganizations=allOrg.concat($scope.organizations);
       SOAPFactory.getSoapProcessors($scope.boporg.dn,$scope.fetchSoapProcessors);
   }
   
//This section fetches the data for all Service Containers per organization.
   
   $scope.fetchSoapProcessors= function(data){
       var myorgcontainers=SOAPFactory.parseSoapProcessors(data);
       $scope.orgcontainers= $scope.orgcontainers.concat(myorgcontainers);
       SOAPFactory.List("Active",$scope.fetchList);
   }
   
   $scope.fetchProcessInstancesData= function(data){
       $scope.allorgprocesses=SOAPFactory.parseProcessInstances(data);
   }
   
//This section fetches the data for all active Service Containers.
   
   $scope.fetchList= function(data){
       $scope.listcontainers=SOAPFactory.parseList(data);
       $scope.cordyssc=SOAPFactory.findServiceEntry($scope.orgcontainers,$scope.listcontainers);
   }       
   
//This function determines the background color of the table cell containing the Service Container name (dn) based on it's Status and Automatic Start type.
   
   $scope.getSoapClass = function(status, start) {
       if ( start == "true" ) {
           switch (status) {
           case 'Stopped':
           case 'Configuration Error':
           case 'Connection Error':
               return 'danger';
           case 'Starting':
               return 'info';
           }
       }
   };
      
//This function creates the BPM Instance overview based on the selected organization.        
   
   
   $scope.SelectBPM = function (selectedOrg){
       for (v = 0; v < $scope.organizations.length; v++)
       {
           if ($scope.organizations[v].description == selectedOrg) {
               $scope.boporg.dn=$scope.organizations[v].dn;
               SOAPFactory.getProcessInstances($scope.boporg.dn,$scope.fetchProcessInstancesData);
               };
       };
   };
     
//This function is the general function to send the SOAP call to the BOP backend.        
   
   $scope.WebGateWay = function() {
           $scope.url=SOAPFactory.getWebGatewayurl($scope.hname.hostname);
   };
   
   $scope.WebGateWayHealth = function() {
           $scope.url=SOAPFactory.getWebGatewayHealthurl($scope.hname.hostname);
   };
   
}]);