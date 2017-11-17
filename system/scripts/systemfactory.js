systemApp.factory('SOAPFactory', ['$http', '$window', function ($http,$window) {
    
// The variable reqparam is used for all SOAP requests as the SOAP call framework.
    
    var reqparam = {
            method: 'POST',
            url: '/cordys/com.eibus.web.soap.Gateway.wcp',
            data: '',
            headers: {
                'Content-Type': "application/soap+xml; charset=utf-8"
            }
        };

// This section below sets the SOAP envelope for all SOAP calls used. Each variable set is specific per SOAP call.
    
        var GetOrganizationData = "<SOAP:Envelope xmlns:SOAP=\"http://schemas.xmlsoap.org/soap/envelope/\">"
          + "<SOAP:Body>"
          + "<GetOrganizations xmlns=\"http://schemas.cordys.com/1.0/ldap\">"
          + "<dn>ORGDN</dn>"
          + "<sort>ascending</sort>"
          + "</GetOrganizations>"
          +  "</SOAP:Body>"
          + "</SOAP:Envelope>";
        
        var GetSoapProcessorsData = "<SOAP:Envelope xmlns:SOAP=\"http://schemas.xmlsoap.org/soap/envelope/\">"
            + "<SOAP:Body>"
            + "<GetSoapProcessors xmlns=\"http://schemas.cordys.com/1.0/ldap\">"
            + "<dn>ORGNAME</dn>"
            + "<sort>ascending</sort>"
            + "<return></return>"
            + "</GetSoapProcessors>"
            +  "</SOAP:Body>"
            + "</SOAP:Envelope>";
        
        var ListData = "<SOAP:Envelope xmlns:SOAP=\"http://schemas.xmlsoap.org/soap/envelope/\">"
            + "<SOAP:Body>"
            + "<List xmlns=\"http://schemas.cordys.com/1.0/monitor\">"
            + "</List>"
            +  "</SOAP:Body>"
            + "</SOAP:Envelope>";
        
        var GetProcessInstancesData = "<SOAP:Envelope xmlns:SOAP=\"http://schemas.xmlsoap.org/soap/envelope/\" url=\"com.eibus.web.soap.Gateway.wcp?organization=PROCORG&amp;messageOptions=0\">"
            + "<SOAP:Body>"
            + "<GetProcessInstances xmlns=\"http://schemas.cordys.com/pim/queryinstancedata/1.0\">"
            + "<Query xmlns=\"http://schemas.cordys.com/cql/1.0\">"
            + "<Select>"
            + "<QueryableObject>PROCESS_INSTANCE</QueryableObject>"
            + "<Field>INSTANCE_ID</Field>"
            + "<Field>PROCESS_NAME</Field>"
            + "<Field>USER_NAME</Field>"
            + "<Field>STATUS</Field>"
            + "<Field>HAS_ERROR</Field>"
            + "</Select>"
            + "<Filters>"
            + "<And>"
            + "<And>"
            + "<EQ field=\"MODEL_SPACE\">"
            + "<Value>1</Value>"
            + "</EQ>"
            + "<EQ field=\"PROCESS_NAME\">"
            + "<Value>TestBPM</Value>"
            + "</EQ>"
            + "</And>"
            + "<In field=\"STATUS\">"
            + "<Value>WAITING</Value>"
            + "</In>"
            + "</And>"
            + "</Filters>"
            + "<Cursor numRows=\"50\" position=\"0\" />"
            + "<OrderBy>"
            + "<Property direction=\"desc\">START_TIME</Property>"
            + "<Property direction=\"desc\">INSTANCE_ID</Property>"
            + "</OrderBy>"
            + "</Query>"
            + "</GetProcessInstances>"
            + "</SOAP:Body>"
            + "</SOAP:Envelope>";

        var SOAPFactory = {};
        
// This factory is called by the OrganizationCtrl controller to get all BOP organizations to populate the drop down box, and is SOAP call specific.
        
   SOAPFactory.getOrganizations = function(splitDN,callback) {
       reqparam.data = GetOrganizationData.replace("ORGDN", splitDN);
       webserviceCall(reqparam,callback);
   };

// This factory handles the SOAP response to get the organizations to populate the drop down box, and is SOAP call specific.
   
    SOAPFactory.parseOrganizations = function(response) {
        var xmlDoc = $.parseXML(response);
        var $xml = $(xmlDoc);
        var organizationsarray = [];
        $xml.find("entry").each(function(){
            var entry={};
            entry.description=($(this).find("description").text());
            entry.dn=$(this).attr("dn");
            organizationsarray.push(entry);
        });
        return organizationsarray;  
    }
    
    SOAPFactory.parseProcessInstances = function(response) {
        console.log(response);
        var xmlDoc = $.parseXML(response);
        var $xml = $(xmlDoc);
        var orgbpmarray = [];
        $xml.find("PROCESS_INSTANCE").each(function() {
            var entry={};
            entry.instanceid=($(this).find("INSTANCE_ID").text());
            entry.username=($(this).find("USER_NAME").text());
            entry.status=($(this).find("STATUS").text());
            entry.error=($(this).find("HAS_ERROR").text());
            entry.processname=($(this).find("PROCESS_NAME").text());
            orgbpmarray.push(entry);
        });
        return orgbpmarray;
        console.log(orgbpmarray);
    }
    
 // This factory is called by the BOPcordysCtrl controller to get all Service Containers per organization, and is SOAP call specific.
    
    SOAPFactory.getSoapProcessors = function(orgDN,callback) {
        reqparam.data = GetSoapProcessorsData.replace("ORGNAME", orgDN);
        webserviceCall(reqparam,callback);
    };
    
    SOAPFactory.getProcessInstances = function(procDN,callback) {
        reqparam.data = GetProcessInstancesData.replace("PROCORG", procDN);
        console.log(reqparam);
        webserviceCall(reqparam,callback);
    };
    

 // This factory handles the SOAP response to get the Service Containers per organization, and is SOAP call specific.
    
     SOAPFactory.parseSoapProcessors = function(response) {
         var xmlDoc = $.parseXML(response);
         var $xml = $(xmlDoc);
         var cordyscontainers = [];
         $xml.find("entry").each(function(){
            var entry={};
            entry.automaticstart=($(this).find("automaticstart").text());
            entry.status="Stopped";
            entry.cn=($(this).find("cn").text());
            entry.dn=$(this).attr("dn");
            var startIndex = entry.dn.indexOf("o=");
            var endIndex = entry.dn.indexOf(",",startIndex);
            entry.soaporgname=entry.dn.slice(startIndex+2,endIndex);
            cordyscontainers.push(entry);
         });
         
         return cordyscontainers;   
        }
    
 // This factory is called by the BOPcordysCtrl controller to get all active Service Containers for all organizations, and is SOAP call specific.
    
    SOAPFactory.List = function(status,callback) {
        reqparam.data = ListData;
        webserviceCall(reqparam,callback);
    };

 // This factory handles the SOAP response to get all active Service Containers, and is SOAP call specific.
    
     SOAPFactory.parseList = function(response) {
         var xmlDoc = $.parseXML(response);
         var $xml = $(xmlDoc);
         var listcontainers = [];
        $xml.find("workerprocess").each(function() {
            var entry={};
            entry.name=($(this).find("name").text());
            entry.vmemory=($(this).find("virtualMemoryUsage").text());
            entry.rmemory=($(this).find("residentMemoryUsage").text());
            entry.nmemory=($(this).find("totalNOMMemory").text());
            entry.status=($(this).find("status").text());
            entry.pid=($(this).find("process-id").text())
            listcontainers.push(entry);
        });
        return listcontainers;
    };
     
    
// This function matches the result set of the GetSoapProcessors and List Web Services and creates one new array to be posted on the htm page.    
    
        SOAPFactory.findServiceEntry = function(orgcontainers,listcontainers) {
            cordyssc = [];
            for (i = 0; i < orgcontainers.length; i++)
            {
                var entry = {};
                entry.automaticstart=$(orgcontainers[i]).attr("automaticstart");
                entry.cn=$(orgcontainers[i]).attr("cn");
                entry.dn=$(orgcontainers[i]).attr("dn");
                entry.orgnamepersc=$(orgcontainers[i]).attr("soaporgname");
                entry.status="Stopped";
                entry.vmemory="N.A.";
                entry.rmemory="N.A.";
                entry.nmemory="N.A.";
                entry.pid="N.A.";
                for (j = 0; j < listcontainers.length; j++)
                {
                    if (listcontainers[j].name == entry.dn) {
                        if (listcontainers[j].status != "") {
                            entry.status=listcontainers[j].status;
                        };
                        if (entry.status != "Stopped") {
                            if (entry.status != "Configuration Error") {
                                entry.vmemory=listcontainers[j].vmemory;
                                entry.rmemory=listcontainers[j].rmemory;
                                entry.nmemory=listcontainers[j].nmemory;
                                entry.pid=listcontainers[j].pid;
                            };
                        };
                    }
                };
                cordyssc.push(entry);
            };
            return cordyssc;
        };
     
 // This function sends the SOAP request to the BOP back end and waits for the SOAP response. It is not SOAP call specific.
    
   function webserviceCall(requestObj, callback){
       $http(requestObj).
             success (callback).
             error(function(httpError) {
                 var errMsg =  httpError.status + " : " + httpError.data;
                 $window.alert("Error: " + errMsg);
             });
    }
        return SOAPFactory;
        
}]);