let app = require('ui/modules').get('app/wazuh', []);

app.controller('agentsController', 
function ($scope, $location, $rootScope, Notifier, appState, genericReq, apiReq, AgentsAutoComplete) {
	$rootScope.page = 'agents';
    $scope.extensions = appState.getExtensions().extensions;
	$scope.agentsAutoComplete = AgentsAutoComplete;
	const notify = new Notifier({ location: 'Agents' });

    // Check the url hash and retriew the tabView information 
	if ($location.search().tabView){
		$scope.tabView = $location.search().tabView;
	} else { // If tabView doesn't exist, default it to 'panels' view
		$scope.tabView = "panels";
		$location.search("tabView", "panels");
	}

    // Check the url hash and retrivew the tab information 
	if ($location.search().tab){
		$scope.tab = $location.search().tab;
	} else { // If tab doesn't exist, default it to 'general' view
		$scope.tab = "general";
		$location.search("tab", "general");

        // Now we initialize the implicitFilter
        $rootScope.currentImplicitFilter = "";
	}

    $scope.hideRing = (items) => {
        return $(".vis-container").length >= items;
    };

	// Object for matching nav items and Wazuh groups
	let tabFilters = {
		"general": {
			"group": ""
		},
		"fim": {
			"group": "syscheck"
		},
		"pm": {
			"group": "rootcheck"
		},
		"oscap": {
			"group": "oscap"
		},
		"audit": {
			"group": "audit"
		},
		"pci": {
			"group": "pci_dss"
		}
	};

    // Switch subtab
    $scope.switchSubtab = (subtab) => {
        $scope.tabView = subtab;
    };

	$scope.switchTab = (tab) => {
        // Deleting app state traces in the url
        $location.search('_a', null);
        $scope.tabView = 'panels';
	};

	// Watchers

	// We watch the resultState provided by the discover
    $rootScope.$watch('resultState', () => {
        $scope.resultState = $rootScope.resultState;
    });
	$scope.$watch('tabView', () => $location.search('tabView', $scope.tabView));
    $scope.$watch('tab', () => {
        $location.search('tab', $scope.tab);
        // Update the implicit filter
        if (tabFilters[$scope.tab].group === "") $rootScope.currentImplicitFilter = "";
        else $rootScope.currentImplicitFilter = tabFilters[$scope.tab].group;
        
    });

    // Agent data
	$scope.getAgentStatusClass = (agentStatus) => agentStatus === "Active" ? "green" : "red";

	$scope.formatAgentStatus = (agentStatus) => {
		let condition = (agentStatus !== "Active" || agentStatus === "Disconnected");
		return (condition) ? "Never connected" : agentStatus;
	};

	const calculateMinutes = (start,end) => {
		let time    = new Date(start);
		let endTime = new Date(end);
		let minutes = ((endTime - time) / 1000) / 60;
		return minutes;
	}

	const validateRootCheck = () => {
		$scope.agent.rootcheck.duration = 'Unknown';
		if ($scope.agent.rootcheck.end && $scope.agent.rootcheck.start) {
			let minutes = calculateMinutes($scope.agent.rootcheck.start, $scope.agent.rootcheck.end);
			$scope.agent.rootcheck.duration = window.Math.round(minutes);
		} else {
			if (!$scope.agent.rootcheck.end) {
				$scope.agent.rootcheck.end = 'Unknown';
			} 
			if (!$scope.agent.rootcheck.start){
				$scope.agent.rootcheck.start = 'Unknown';
			}
		}	
	}

	const validateSysCheck = () => {
		$scope.agent.syscheck.duration = 'Unknown';
		if ($scope.agent.syscheck.end && $scope.agent.syscheck.start) {
			let minutes  = calculateMinutes($scope.agent.syscheck.start, $scope.agent.syscheck.end);
			$scope.agent.syscheck.duration = window.Math.round(minutes);
		} else {
			if (!$scope.agent.syscheck.end) {
				$scope.agent.syscheck.end = 'Unknown';
			} 
			if (!$scope.agent.syscheck.start){
				$scope.agent.syscheck.start = 'Unknown';
			}
		}
	}

	$scope.getAgent = () => {
		$scope.agent = Object.assign($rootScope.globalAgent);
		delete $rootScope.globalAgent;

		$location.search('id', $scope.agent.id);
		
		Promise.all([
			apiReq.request('GET', `/syscheck/${$scope.agent.id}/last_scan`, {}),
			apiReq.request('GET', `/rootcheck/${$scope.agent.id}/last_scan`, {})
		])
		.then(data => {
			// Syscheck
			$scope.agent.syscheck = data[0].data.data;
			validateSysCheck();		
			// Rootcheck
			$scope.agent.rootcheck = data[1].data.data;
			validateRootCheck();	

			$scope.$digest();
		})
		.catch(error => notify.error(error.message));
	};

	//Load
	try {
		$scope.getAgent();
		$scope.agentsAutoComplete.nextPage('');
	} catch (e) {
		notify.error('Unexpected exception loading controller');
	}

	//Destroy
	$scope.$on("$destroy", () => $scope.agentsAutoComplete.reset());

	//PCI tab
	let tabs = [];
	genericReq.request('GET', '/api/wazuh-api/pci/all')
		.then((data) => {
			for(let key in data.data){
				tabs.push({
					"title": key,
					"content": data.data[key]
				});
			}
		});

	$scope.tabs 		 = tabs;
	$scope.selectedIndex = 0;
});
