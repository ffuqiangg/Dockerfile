define(["exports","./events.js","./apiclient.js","./credentials.js","./../common/servicelocator.js","./../common/querystring.js","./../common/usersettings/usersettings.js","./../common/appsettings.js"],function(_exports,_events,_apiclient,_credentials,_servicelocator,_querystring,_usersettings,_appsettings){Object.defineProperty(_exports,"__esModule",{value:!0}),_exports.default=void 0;var _currentApiClient,defaultTimeout=2e4;function setCurrentApiClient(instance,apiClient){instance.globalScopeApiClient&&(globalThis.ApiClient=apiClient),_currentApiClient=apiClient}var ConnectionMode_Local=0,ConnectionMode_Remote=1,ConnectionMode_Manual=2;function getServerAddress(server,mode){switch(mode){case ConnectionMode_Local:return server.LocalAddress;case ConnectionMode_Manual:return server.ManualAddress;case ConnectionMode_Remote:return server.RemoteAddress;default:return server.ManualAddress||server.LocalAddress||server.RemoteAddress}}function mergeServers(credentialProvider,list1,list2){for(var changed=!1,i=0,length=list2.length;i<length;i++)credentialProvider.addOrUpdateServer(list1,list2[i])&&(changed=!0);return changed}function updateServerInfo(server,systemInfo){systemInfo.ServerName&&(server.Name=systemInfo.ServerName),systemInfo.Id&&(server.Id=systemInfo.Id),systemInfo.LocalAddress&&(server.LocalAddress=systemInfo.LocalAddress),systemInfo.WanAddress&&(server.RemoteAddress=systemInfo.WanAddress)}function getFetchPromise(request,signal){var err,fetchRequest,abortController,boundAbort;return signal&&signal.aborted?Promise.reject(((err=new Error("AbortError")).name="AbortError",err)):(err=request.headers||{},"json"===request.dataType&&(err.accept="application/json"),fetchRequest={headers:err,method:request.type,credentials:"same-origin"},request.timeout&&(boundAbort=(abortController=new AbortController).abort.bind(abortController),signal&&signal.addEventListener("abort",boundAbort),setTimeout(boundAbort,request.timeout),signal=abortController.signal),signal&&(fetchRequest.signal=signal),boundAbort=request.contentType,request.data&&("string"==typeof request.data?fetchRequest.body=request.data:(fetchRequest.body=_querystring.default.paramsToString(request.data),boundAbort=boundAbort||"application/x-www-form-urlencoded; charset=UTF-8")),boundAbort&&(err["Content-Type"]=boundAbort),fetch(request.url,fetchRequest))}function sortServers(a,b){return(b.DateLastAccessed||0)-(a.DateLastAccessed||0)}function setServerProperties(server){server.Type="Server"}function ajax(request,signal){if(request)return request.headers=request.headers||{},console.log("ConnectionManager requesting url: ".concat(request.url)),getFetchPromise(request,signal).then(function(response){return console.log("ConnectionManager response status: ".concat(response.status,", url: ").concat(request.url)),response.status<400?"json"===request.dataType?response.json():"text"===request.dataType?response.text():"application/json"===request.headers.accept?response.json():204===response.status?response.text():response:Promise.reject(response)});throw new Error("Request cannot be null")}function getConnectUrl(handler){return"https://connect.emby.media/service/".concat(handler)}function replaceAll(originalString,strReplace,strWith){strReplace=new RegExp(strReplace,"ig");return originalString.replace(strReplace,strWith)}function normalizeAddress(address){return address=replaceAll(address=(address=address.trim()).toLowerCase().startsWith("http")?address:(address.includes(":443")||address.includes(":8920")?"https://":"http://").concat(address),"Http:","http:"),address=replaceAll(address,"Https:","https:")}function compareVersions(a,b){a=a.split("."),b=b.split(".");for(var i=0,length=Math.max(a.length,b.length);i<length;i++){var aVal=parseInt(a[i]||"0"),bVal=parseInt(b[i]||"0");if(aVal<bVal)return-1;if(bVal<aVal)return 1}return 0}function addAppInfoToConnectRequest(instance,request){request.headers=request.headers||{},request.headers["X-Application"]="".concat(instance.appName(),"/").concat(instance.appVersion())}function getCacheKey(feature,apiClient,argument_2){var viewOnly=(2<arguments.length&&void 0!==argument_2?argument_2:{}).viewOnly,cacheKey="regInfo-".concat(apiClient.serverId());return viewOnly&&(cacheKey+="-viewonly"),cacheKey}function onConnectUserSignIn(instance,user){instance._connectUser=user,_events.default.trigger(instance,"connectusersignedin",[user])}function ensureConnectUser(instance,credentials){var connectUser=instance.connectUser();return(!connectUser||connectUser.Id!==credentials.ConnectUserId)&&credentials.ConnectUserId&&credentials.ConnectAccessToken?(instance._connectUser=null,function(instance,userId,accessToken){if(!userId)throw new Error("null userId");if(accessToken)return ajax({type:"GET",url:"https://connect.emby.media/service/user?id=".concat(userId),dataType:"json",headers:{"X-Application":"".concat(instance.appName(),"/").concat(instance.appVersion()),"X-Connect-UserToken":accessToken}});throw new Error("null accessToken")}(instance,credentials.ConnectUserId,credentials.ConnectAccessToken).then(function(user){return onConnectUserSignIn(instance,user),Promise.resolve()},function(){return Promise.resolve()})):Promise.resolve()}function updateUserAuthenticationInfoOnServer(server,userId,accessToken){if(accessToken){server.UserId=userId,server.AccessToken=accessToken,server.AccessToken=null;for(var users=(server.Users||[]).slice(0),i=0,length=users.length;i<length;i++){var user=users[i];if(user.UserId===userId)return void(user.AccessToken=accessToken)}users.push({UserId:userId,AccessToken:accessToken}),server.Users=users}else removeUserFromServer(server,userId)}function removeUserFromServer(server,userId){if(server.UserId===userId&&(server.UserId=null),server.AccessToken=null,server.Users){for(var users=(server.Users||[]).slice(0),list=[],i=0,length=users.length;i<length;i++){var user=users[i];user.UserId!==userId&&list.push(user)}server.Users=list}}function clearUsersFromServer(server){server.UserId=null,server.AccessToken=null,server.Users&&(server.Users=[])}function getUserAuthInfoFromServer(server,userId){if(server.Users){for(var users=(server.Users||[]).slice(0),i=0,length=users.length;i<length;i++){var user=users[i];if(user.UserId===userId)return user}return null}return server.UserId===userId&&server.AccessToken?{UserId:userId,AccessToken:server.AccessToken}:null}function getLastUserAuthInfoFromServer(server){return server.UserId?getUserAuthInfoFromServer(server,server.UserId):null}function validateAuthentication(instance,server,userAuthInfo,serverUrl){console.log("connectionManager.validateAuthentication: "+serverUrl);var userId=userAuthInfo.UserId;return ajax({type:"GET",url:instance.getEmbyServerUrl(serverUrl,"System/Info",{api_key:userAuthInfo.AccessToken}),dataType:"json"}).then(function(systemInfo){return updateServerInfo(server,systemInfo),systemInfo},function(){return removeUserFromServer(server,userId),Promise.resolve()})}function findServers(){function onFinish(foundServers){return foundServers.map(function(foundServer){foundServer={Id:foundServer.Id,LocalAddress:function(info){var address;return info.Address&&info.EndpointAddress?(address=info.EndpointAddress.split(":")[0],1<(info=info.Address.split(":")).length&&(info=info[info.length-1],isNaN(parseInt(info))||(address+=":".concat(info))),normalizeAddress(address)):null}(foundServer)||foundServer.Address,Name:foundServer.Name};return foundServer.LastConnectionMode=foundServer.ManualAddress?ConnectionMode_Manual:ConnectionMode_Local,foundServer})}return _servicelocator.serverDiscovery.findServers(1e3).then(onFinish,function(){return onFinish([])})}function validateServerAddressWithEndpoint(connectionManager,url,endpoint){return ajax({url:connectionManager.getEmbyServerUrl(url,endpoint),timeout:defaultTimeout,type:"GET",dataType:"text"}).then(function(result){var srch=String.fromCharCode(106)+String.fromCharCode(101)+String.fromCharCode(108)+String.fromCharCode(108)+String.fromCharCode(121)+String.fromCharCode(102);return(result||"").toLowerCase().includes(srch)?Promise.reject():Promise.resolve()})}function onAuthenticated(apiClient,result){var options={},instance=this,credentials=_credentials.default.credentials(),servers=credentials.Servers.filter(function(s){return s.Id===result.ServerId}),server=servers.length?servers[0]:apiClient.serverInfo();return!1!==options.updateDateLastAccessed&&(server.DateLastAccessed=Date.now()),server.Id=result.ServerId,updateUserAuthenticationInfoOnServer(server,result.User.Id,result.AccessToken),_credentials.default.addOrUpdateServer(credentials.Servers,server)&&_credentials.default.credentials(credentials),apiClient.enableAutomaticBitrateDetection=options.enableAutomaticBitrateDetection,apiClient.serverInfo(server),apiClient.setAuthenticationInfo(getUserAuthInfoFromServer(server,result.User.Id),(server.Users||[]).slice(0)),options.reportCapabilities=!0,afterConnected(instance,apiClient,server,options),apiClient.getPublicSystemInfo().then(function(systemInfo){return updateServerInfo(server,systemInfo),_credentials.default.addOrUpdateServer(credentials.Servers,server)&&_credentials.default.credentials(credentials),instance._getOrAddApiClient(server,apiClient.serverAddress()),onLocalUserSignIn(instance,server,apiClient,result.User.Id,apiClient.serverAddress())})}function afterConnected(instance,apiClient,server,argument_3){var options=3<arguments.length&&void 0!==argument_3?argument_3:{};!0!==options.reportCapabilities&&!1===options.reportCapabilities||!function(instance,apiClient){instance.reportCapabilities(apiClient)}(instance,apiClient),apiClient.enableAutomaticBitrateDetection=options.enableAutomaticBitrateDetection,apiClient.enableWebSocketAutoConnect=!1!==options.enableWebSocket,apiClient.enableWebSocketAutoConnect&&(console.log("calling apiClient.ensureWebSocket"),apiClient.connected=!0,apiClient.ensureWebSocket())}function onLocalUserSignIn(instance,server,apiClient,userId){return setCurrentApiClient(instance,apiClient),_usersettings.default.setUserInfo(userId,apiClient).then(function(){_events.default.trigger(instance,"localusersignedin",[server.Id,userId,apiClient])})}function tryReconnectToUrl(instance,url,connectionMode,delay,signal){return console.log("tryReconnectToUrl: "+url),timeout=delay,new Promise(function(resolve){setTimeout(resolve,timeout)}).then(function(){return ajax({url:instance.getEmbyServerUrl(url,"system/info/public"),timeout:defaultTimeout,type:"GET",dataType:"json"},signal).then(function(result){return{url:url,connectionMode:connectionMode,data:result}})});var timeout}function afterConnectValidated(instance,server,credentials,systemInfo,connectionMode,serverUrl,verifyLocalAuthentication,options){console.log("connectionManager.afterConnectValidated: "+serverUrl);var userAuthInfo=((options=options||{}).userId?getUserAuthInfoFromServer(server,options.userId):getLastUserAuthInfoFromServer(server))||{};if(verifyLocalAuthentication&&userAuthInfo.UserId&&userAuthInfo.AccessToken)return validateAuthentication(instance,server,userAuthInfo,serverUrl).then(function(fullSystemInfo){return afterConnectValidated(instance,server,credentials,fullSystemInfo||systemInfo,connectionMode,serverUrl,!1,options)});updateServerInfo(server,systemInfo),server.LastConnectionMode=connectionMode,!1!==options.updateDateLastAccessed&&(server.DateLastAccessed=Date.now()),_credentials.default.addOrUpdateServer(credentials.Servers,server)&&_credentials.default.credentials(credentials);function resolveActions(){return _events.default.trigger(instance,"connected",[result]),Promise.resolve(result)}var result={Servers:[]},verifyLocalAuthentication=(result.ApiClient=instance._getOrAddApiClient(server,serverUrl),result.ApiClient.setSystemInfo(systemInfo),options.enableAutoLogin);null==verifyLocalAuthentication&&(verifyLocalAuthentication=_appsettings.default.enableAutoLogin()),result.State=userAuthInfo.UserId&&userAuthInfo.AccessToken&&!1!==verifyLocalAuthentication?"SignedIn":"ServerSignIn",result.Servers.push(server),result.ApiClient.enableAutomaticBitrateDetection=options.enableAutomaticBitrateDetection,result.ApiClient.updateServerInfo(server,serverUrl),instance.resetRegistrationInfo(result.ApiClient,!0);return console.log("connectionManager.afterConnectValidated result.State: "+(result.State||"")),"SignedIn"===result.State?(afterConnected(instance,result.ApiClient,server,options),onLocalUserSignIn(instance,server,result.ApiClient,userAuthInfo.UserId).then(resolveActions,resolveActions)):resolveActions()}function onSuccessfulConnection(instance,server,systemInfo,connectionMode,serverUrl,options){console.log("connectionManager.onSuccessfulConnection: "+serverUrl);var credentials=_credentials.default.credentials(),enableAutoLogin=(options=options||{}).enableAutoLogin;return null==enableAutoLogin&&(enableAutoLogin=_appsettings.default.enableAutoLogin()),credentials.ConnectAccessToken&&!1!==enableAutoLogin?ensureConnectUser(instance,credentials).then(function(){return server.ExchangeToken?function(instance,server,serverUrl,credentials){if(!server.ExchangeToken)throw new Error("server.ExchangeToken cannot be null");var appName,appVersion,deviceName;if(credentials.ConnectUserId)return serverUrl=instance.getEmbyServerUrl(serverUrl,"Connect/Exchange",{format:"json",ConnectUserId:credentials.ConnectUserId}),credentials={"X-Emby-Token":server.ExchangeToken},appName=instance.appName(),appVersion=instance.appVersion(),deviceName=instance.deviceName(),instance=instance.deviceId(),appName&&(credentials["X-Emby-Client"]=appName),deviceName&&(credentials["X-Emby-Device-Name"]=encodeURIComponent(deviceName)),instance&&(credentials["X-Emby-Device-Id"]=instance),appVersion&&(credentials["X-Emby-Client-Version"]=appVersion),ajax({type:"GET",url:serverUrl,dataType:"json",headers:credentials}).then(function(auth){return updateUserAuthenticationInfoOnServer(server,auth.LocalUserId,auth.AccessToken),auth},function(){return clearUsersFromServer(server),Promise.reject()});throw new Error("credentials.ConnectUserId cannot be null")}(instance,server,serverUrl,credentials).then(function(){return afterConnectValidated(instance,server,credentials,systemInfo,connectionMode,serverUrl,!0,options)},function(){return afterConnectValidated(instance,server,credentials,systemInfo,connectionMode,serverUrl,!0,options)}):afterConnectValidated(instance,server,credentials,systemInfo,connectionMode,serverUrl,!0,options)}):afterConnectValidated(instance,server,credentials,systemInfo,connectionMode,serverUrl,!0,options)}function resolveIfAvailable(instance,url,server,result,connectionMode,options){return console.log("connectionManager.resolveIfAvailable: "+url),function(instance,url){return!1===instance.enableServerAddressValidation?Promise.resolve():Promise.all([validateServerAddressWithEndpoint(instance,url,"web/manifest.json"),validateServerAddressWithEndpoint(instance,url,"web/index.html"),validateServerAddressWithEndpoint(instance,url,"web/strings/en-US.json")])}(instance,url).then(function(){return onSuccessfulConnection(instance,server,result,connectionMode,url,options)},function(){return console.log("minServerVersion requirement not met. Server version: "+result.Version),{State:"ServerUpdateNeeded",Servers:[server]}})}function onGetUserRecordFromAuthenticationError(err){return console.log("Error in getUserRecordFromAuthentication: "+err),Promise.resolve(null)}function getUserRecordFromAuthentication(user,apiClient){return(user.UserId===apiClient.getCurrentUserId()?apiClient.getCurrentUser():apiClient.getUser(user.UserId)).catch(onGetUserRecordFromAuthenticationError)}var ConnectionManager=function(){return babelHelpers.createClass(function ConnectionManager(){babelHelpers.classCallCheck(this,ConnectionManager),this._apiClients=[],this._apiClientsMap={},console.log("Begin ConnectionManager constructor"),this._appName=_servicelocator.appHost.appName(),this._appVersion=_servicelocator.appHost.appVersion(),this._deviceName=_servicelocator.appHost.deviceName(),this._deviceId=_servicelocator.appHost.deviceId(),this._minServerVersion="4.7.12",_events.default.on(_credentials.default,"credentialsupdated",function(e,data){_events.default.trigger(this,"credentialsupdated",[data])}.bind(this))},[{key:"appName",value:function(){return this._appName}},{key:"appVersion",value:function(){return this._appVersion}},{key:"deviceName",value:function(){return this._deviceName}},{key:"deviceId",value:function(){return this._deviceId}},{key:"minServerVersion",value:function(val){return val&&(this._minServerVersion=val),this._minServerVersion}},{key:"connectUser",value:function(){return this._connectUser}},{key:"connectUserId",value:function(){return _credentials.default.credentials().ConnectUserId}},{key:"connectToken",value:function(){return _credentials.default.credentials().ConnectAccessToken}},{key:"getServerInfo",value:function(id){return _credentials.default.credentials().Servers.filter(function(s){return s.Id===id})[0]}},{key:"getLastUsedServer",value:function(){var servers=_credentials.default.credentials().Servers;return servers.sort(sortServers),servers.length?servers[0]:null}},{key:"getApiClientFromServerInfo",value:function(server,serverUrlToMatch){server.DateLastAccessed=Date.now(),null==server.LastConnectionMode&&server.ManualAddress&&(server.LastConnectionMode=ConnectionMode_Manual);var credentials=_credentials.default.credentials(),serverUrlToMatch=(_credentials.default.addOrUpdateServer(credentials.Servers,server,serverUrlToMatch)&&_credentials.default.credentials(credentials),this._getOrAddApiClient(server,getServerAddress(server,server.LastConnectionMode)));return setCurrentApiClient(this,serverUrlToMatch),serverUrlToMatch}},{key:"clearData",value:function(){console.log("connection manager clearing data"),this._connectUser=null;var credentials=_credentials.default.credentials();credentials.ConnectAccessToken=null,credentials.ConnectUserId=null,credentials.Servers=[],_credentials.default.credentials(credentials)}},{key:"currentApiClient",value:function(){var server;return _currentApiClient||(server=this.getLastUsedServer())&&(_currentApiClient=setCurrentApiClient(this,this.getApiClient(server.Id))),_currentApiClient}},{key:"_getOrAddApiClient",value:function(server,serverUrl){var apiClient=server.Id?this.getApiClient(server.Id):null;if(!apiClient&&server.IsLocalServer)for(var i=0,length=this._apiClients.length;i<length;i++){var current=this._apiClients[i];if(current.serverInfo().IsLocalServer){apiClient=current;break}}return apiClient?server.Id&&(apiClient.serverId()||(apiClient.serverInfo(server),apiClient.setAuthenticationInfo(getLastUserAuthInfoFromServer(server),(server.Users||[]).slice(0))),this._apiClientsMap[server.Id]=apiClient):(apiClient=new _servicelocator.apiClientFactory(serverUrl,this.appName(),this.appVersion(),this.deviceName(),this.deviceId(),this.devicePixelRatio),_currentApiClient=_currentApiClient||apiClient,this._apiClients.push(apiClient),apiClient.serverInfo(server),apiClient.setAuthenticationInfo(getLastUserAuthInfoFromServer(server),(server.Users||[]).slice(0)),apiClient.serverId()&&(this._apiClientsMap[apiClient.serverId()]=apiClient),apiClient.setCurrentLocale(this.currentLocale),apiClient.onAuthenticated=onAuthenticated.bind(this),_events.default.trigger(this,"apiclientcreated",[apiClient])),console.log("returning instance from getOrAddApiClient"),apiClient}},{key:"setCurrentLocale",value:function(value){this.currentLocale=value;for(var i=0,length=this._apiClients.length;i<length;i++)this._apiClients[i].setCurrentLocale(value)}},{key:"logout",value:function(apiClient){console.log("begin connectionManager loguot");for(var promises=[],isLoggedIntoConnect=this.isLoggedIntoConnect(),apiClients=apiClient&&!isLoggedIntoConnect?[apiClient]:this._apiClients.slice(0),apiClientInfos=[],i=0,length=apiClients.length;i<length;i++){var currApiClient=apiClients[i];currApiClient.accessToken()&&(promises.push(function(instance,apiClient){var logoutInfo={serverId:apiClient.serverId()};return apiClient.logout().then(function(){_usersettings.default.setUserInfo(null,null),_events.default.trigger(instance,"localusersignedout",[logoutInfo])},function(){_usersettings.default.setUserInfo(null,null),_events.default.trigger(instance,"localusersignedout",[logoutInfo])})}(this,currApiClient)),apiClientInfos.push({userId:currApiClient.getCurrentUserId(),serverId:currApiClient.serverId()}))}var instance=this;return Promise.all(promises).then(function(){for(var credentials=_credentials.default.credentials(),servers=credentials.Servers.slice(0),_i=0,_length=apiClientInfos.length;_i<_length;_i++)!function(){var server,apiClientInfo=apiClientInfos[_i],currentServerId=apiClientInfo.serverId;currentServerId&&(server=servers.filter(function(s){return s.Id===currentServerId})[0])&&(isLoggedIntoConnect?clearUsersFromServer(server):removeUserFromServer(server,apiClientInfo.userId),server.ExchangeToken=null)}();credentials.Servers=servers,credentials.ConnectAccessToken=null,credentials.ConnectUserId=null,_credentials.default.credentials(credentials),instance._connectUser=null})}},{key:"getSavedServers",value:function(){var servers;return _credentials.default?((servers=_credentials.default.credentials().Servers.slice(0)).forEach(setServerProperties),servers.sort(sortServers),servers):(console.log("A call was made to getSavedServers before connectionManager was initialized."),[])}},{key:"getAvailableServers",value:function(){console.log("Begin getAvailableServers");var credentials=_credentials.default.credentials();return Promise.all([function(instance,credentials){return console.log("Begin getConnectServers"),credentials.ConnectAccessToken&&credentials.ConnectUserId?ajax({type:"GET",url:"https://connect.emby.media/service/servers?userId=".concat(credentials.ConnectUserId),dataType:"json",headers:{"X-Application":"".concat(instance.appName(),"/").concat(instance.appVersion()),"X-Connect-UserToken":credentials.ConnectAccessToken}}).then(function(servers){return servers.map(function(i){return{ExchangeToken:i.AccessKey,ConnectServerId:i.Id,Id:i.SystemId,Name:i.Name,RemoteAddress:i.Url,LocalAddress:i.LocalAddress}})},function(){return credentials.Servers.slice(0).filter(function(s){return s.ExchangeToken})}):Promise.resolve([])}(this,credentials),findServers()]).then(function(responses){var connectServers=responses[0],responses=responses[1],servers=credentials.Servers.slice(0),changed=!1;return mergeServers(_credentials.default,servers,responses)&&(changed=!0),mergeServers(_credentials.default,servers,connectServers)&&(changed=!0),(servers=function(servers,connectServers){return servers.filter(function(server){return!server.ExchangeToken||0<connectServers.filter(function(connectServer){return server.Id===connectServer.Id}).length})}(servers,connectServers)).forEach(setServerProperties),servers.sort(sortServers),changed||JSON.stringify(servers)!==JSON.stringify(credentials.Servers)&&(changed=!0),changed&&(credentials.Servers=servers,_credentials.default.credentials(credentials)),servers})}},{key:"connectToServers",value:function(servers,options){console.log("Begin connectToServers, with ".concat(servers.length," servers"));var firstServer=servers.length?servers[0]:null;return firstServer?this.connectToServer(firstServer,options).then(function(result){return"Unavailable"===result.State&&(result.State="ServerSelection"),console.log("resolving connectToServers with result.State: "+result.State),result}):Promise.resolve({Servers:servers,State:servers.length||this.connectUser()?"ServerSelection":"ConnectSignIn",ConnectUser:this.connectUser()})}},{key:"connectToServer",value:function(server,options){console.log("begin connectToServer"),options=options||{};var instance=this;return function(instance,serverInfo,signal){var addresses=[],addressesStrings=[];if(serverInfo.ManualAddress&&((address=serverInfo.ManualAddress).includes("://127.0.0.1")||!!address.toLowerCase().includes("://localhost"))&&!addressesStrings.includes(serverInfo.ManualAddress.toLowerCase())&&(addresses.push({url:serverInfo.ManualAddress,mode:ConnectionMode_Manual}),addressesStrings.push(addresses[addresses.length-1].url.toLowerCase())),serverInfo.ManualAddressOnly||!serverInfo.LocalAddress||addressesStrings.includes(serverInfo.LocalAddress.toLowerCase())||(addresses.push({url:serverInfo.LocalAddress,mode:ConnectionMode_Local}),addressesStrings.push(addresses[addresses.length-1].url.toLowerCase())),serverInfo.ManualAddress&&!addressesStrings.includes(serverInfo.ManualAddress.toLowerCase())&&(addresses.push({url:serverInfo.ManualAddress,mode:ConnectionMode_Manual}),addressesStrings.push(addresses[addresses.length-1].url.toLowerCase())),serverInfo.ManualAddressOnly||!serverInfo.RemoteAddress||addressesStrings.includes(serverInfo.RemoteAddress.toLowerCase())||(addresses.push({url:serverInfo.RemoteAddress,mode:ConnectionMode_Remote}),addressesStrings.push(addresses[addresses.length-1].url.toLowerCase())),console.log("tryReconnect: "+addressesStrings.join("|")),!addressesStrings.length)return Promise.reject();for(var abortController=new AbortController,address=abortController.abort.bind(abortController),promises=(signal&&signal.addEventListener("abort",address),signal=abortController.signal,[]),i=0,length=addresses.length;i<length;i++)promises.push(tryReconnectToUrl(instance,addresses[i].url,addresses[i].mode,200*i,signal));return Promise.any(promises).then(function(result){return abortController.abort(),result})}(this,server).then(function(result){var serverUrl=result.url,connectionMode=result.connectionMode;return result=result.data,1===compareVersions(instance.minServerVersion(),result.Version)||1===compareVersions(result.Version,"8.0")?(console.log("minServerVersion requirement not met. Server version: "+result.Version),{State:"ServerUpdateNeeded",Servers:[server]}):(server.Id&&result.Id!==server.Id&&!1!==instance.validateServerIds&&updateServerInfo(server={Id:result.Id,ManualAddress:serverUrl},result),resolveIfAvailable(instance,serverUrl,server,result,connectionMode,options))},function(){return{State:"Unavailable",Server:server,ConnectUser:instance.connectUser()}})}},{key:"connectToAddress",value:function(address,options){if(!address)return Promise.reject();address=normalizeAddress(address);var instance=this;var server={ManualAddress:address,LastConnectionMode:ConnectionMode_Manual};return this.connectToServer(server,options).catch(function(){return console.log("connectToAddress ".concat(address," failed")),Promise.resolve({State:"Unavailable",ConnectUser:instance.connectUser(),Server:{ManualAddress:address}})})}},{key:"loginToConnect",value:function(username,password){var instance;return username&&password?ajax({type:"POST",url:"https://connect.emby.media/service/user/authenticate",data:{nameOrEmail:username,rawpw:password},dataType:"json",contentType:"application/x-www-form-urlencoded; charset=UTF-8",headers:{"X-Application":"".concat((instance=this).appName(),"/").concat(this.appVersion())}}).then(function(result){var credentials=_credentials.default.credentials();return credentials.ConnectAccessToken=result.AccessToken,credentials.ConnectUserId=result.User.Id,_credentials.default.credentials(credentials),onConnectUserSignIn(instance,result.User),result}):Promise.reject()}},{key:"signupForConnect",value:function(options){var email=options.email,username=options.username,password=options.password,passwordConfirm=options.passwordConfirm;return email&&username&&password?!passwordConfirm||password!==passwordConfirm?Promise.reject({errorCode:"passwordmatch"}):(passwordConfirm={email:email,userName:username,rawpw:password},options.grecaptcha&&(passwordConfirm.grecaptcha=options.grecaptcha),ajax({type:"POST",url:"https://connect.emby.media/service/register",data:passwordConfirm,dataType:"json",contentType:"application/x-www-form-urlencoded; charset=UTF-8",headers:{"X-Application":"".concat(this.appName(),"/").concat(this.appVersion()),"X-CONNECT-TOKEN":"CONNECT-REGISTER"}}).catch(function(response){return response.json()}).then(function(result){if(result&&result.Status)return"SUCCESS"===result.Status?Promise.resolve(result):Promise.reject({errorCode:result.Status});Promise.reject()})):Promise.reject({errorCode:"invalidinput"})}},{key:"getUserInvitations",value:function(){var connectToken=this.connectToken();if(!connectToken)throw new Error("null connectToken");if(this.connectUserId())return ajax({type:"GET",url:"https://connect.emby.media/service/servers?userId=".concat(this.connectUserId(),"&status=Waiting"),dataType:"json",headers:{"X-Connect-UserToken":connectToken,"X-Application":"".concat(this.appName(),"/").concat(this.appVersion())}});throw new Error("null connectUserId")}},{key:"deleteServer",value:function(serverId){var server,connectToken,connectUserId;if(serverId)return(server=(server=_credentials.default.credentials().Servers.filter(function(s){return s.Id===serverId})).length?server[0]:null).ConnectServerId&&(connectToken=this.connectToken(),connectUserId=this.connectUserId(),connectToken)&&connectUserId?ajax({type:"DELETE",url:"https://connect.emby.media/service/serverAuthorizations?serverId=".concat(server.ConnectServerId,"&userId=").concat(connectUserId),headers:{"X-Connect-UserToken":connectToken,"X-Application":"".concat(this.appName(),"/").concat(this.appVersion())}}).then(onDone,onDone):onDone();throw new Error("null serverId");function onDone(){var credentials=_credentials.default.credentials();return credentials.Servers=credentials.Servers.filter(function(s){return s.Id!==serverId}),_credentials.default.credentials(credentials),Promise.resolve()}}},{key:"resetRegistrationInfo",value:function(apiClient,onlyResetIfFailed){var removeAll=!1,cacheKey=getCacheKey("themes",apiClient,{viewOnly:!0}),regInfo=JSON.parse(_servicelocator.appStorage.getItem(cacheKey)||"{}");!removeAll&&onlyResetIfFailed&&-1!==regInfo.lastValidDate||(_servicelocator.appStorage.removeItem(cacheKey),removeAll=!0),cacheKey=getCacheKey("themes",apiClient,{viewOnly:!1}),regInfo=JSON.parse(_servicelocator.appStorage.getItem(cacheKey)||"{}"),!removeAll&&onlyResetIfFailed&&-1!==regInfo.lastValidDate||(_servicelocator.appStorage.removeItem(cacheKey),removeAll=!0),onlyResetIfFailed||_events.default.trigger(this,"resetregistrationinfo")}},{key:"getRegistrationInfo",value:function(feature,apiClient,options){var regCacheValid,params={serverId:apiClient.serverId(),deviceId:this.deviceId(),deviceName:this.deviceName(),appName:this.appName(),appVersion:this.appVersion()},cacheKey=((options=options||{}).viewOnly&&(params.viewOnly=options.viewOnly),getCacheKey(feature,apiClient,options)),feature=JSON.parse(_servicelocator.appStorage.getItem(cacheKey)||"{}"),timeSinceLastValidation=Date.now()-(feature.lastValidDate||0);return timeSinceLastValidation<=864e5?(console.log("getRegistrationInfo returning cached info"),Promise.resolve()):options.useCachedFailure&&-1===feature.lastValidDate||(regCacheValid=timeSinceLastValidation<=864e5*(feature.cacheExpirationDays||7),!params.serverId)||(options=apiClient.getCurrentUserId())&&"81f53802ea0247ad80618f55d9b4ec3c"===options.toLowerCase()&&"21585256623b4beeb26d5d3b09dec0ac"===params.serverId.toLowerCase()?Promise.reject():(timeSinceLastValidation=_servicelocator.appStorage.setItem(cacheKey,JSON.stringify({lastValidDate:Date.now(),deviceId:params.deviceId,cacheExpirationDays:365,lastUpdated:Date.now()})),Promise.resolve(),regCacheValid?(console.log("getRegistrationInfo returning cached info"),Promise.resolve()):timeSinceLastValidation)}},{key:"createPin",value:function(){var request={type:"POST",url:getConnectUrl("pin"),data:{deviceId:this.deviceId()},dataType:"json"};return addAppInfoToConnectRequest(this,request),ajax(request)}},{key:"getPinStatus",value:function(pinInfo){if(pinInfo)return pinInfo={deviceId:pinInfo.DeviceId,pin:pinInfo.Pin},addAppInfoToConnectRequest(this,pinInfo={type:"GET",url:"".concat(getConnectUrl("pin"),"?").concat(new URLSearchParams(pinInfo).toString()),dataType:"json"}),ajax(pinInfo);throw new Error("pinInfo cannot be null")}},{key:"exchangePin",value:function(pinInfo){var instance;if(pinInfo)return instance=this,function(instance,pinInfo){if(pinInfo)return addAppInfoToConnectRequest(instance,instance={type:"POST",url:getConnectUrl("pin/authenticate"),data:{deviceId:pinInfo.DeviceId,pin:pinInfo.Pin},dataType:"json"}),ajax(instance);throw new Error("pinInfo cannot be null")}(this,pinInfo).then(function(result){var credentials=_credentials.default.credentials();return credentials.ConnectAccessToken=result.AccessToken,credentials.ConnectUserId=result.UserId,_credentials.default.credentials(credentials),ensureConnectUser(instance,credentials)});throw new Error("pinInfo cannot be null")}},{key:"connect",value:function(options){console.log("Begin connect");var instance=this;return instance.getAvailableServers().then(function(servers){return instance.connectToServers(servers,options)})}},{key:"handleMessageReceived",value:function(msg){var serverId=msg.ServerId;if(serverId){serverId=this.getApiClient(serverId);if(serverId){if("string"==typeof msg.Data)try{msg.Data=JSON.parse(msg.Data)}catch(err){console.log("Error in handleMessageReceived JSON.parse: ".concat(err))}serverId.handleMessageReceived(msg)}}}},{key:"onNetworkChanged",value:function(){for(var apiClients=this._apiClients,i=0,length=apiClients.length;i<length;i++)apiClients[i].onNetworkChanged()}},{key:"onAppResume",value:function(){for(var apiClients=this._apiClients,i=0,length=apiClients.length;i<length;i++)apiClients[i].ensureWebSocket()}},{key:"isLoggedIntoConnect",value:function(){return!(!this.connectToken()||!this.connectUserId())}},{key:"isLoggedIn",value:function(serverId,userId){var server=_credentials.default.credentials().Servers.filter(function(s){return s.Id===serverId})[0];return!!server&&null!=(null==(userId=userId?getUserAuthInfoFromServer(server,userId):getLastUserAuthInfoFromServer(server))?void 0:userId.AccessToken)}},{key:"getApiClients",value:function(){for(var servers=this.getSavedServers(),i=0,length=servers.length;i<length;i++){var serverUrl,server=servers[i];server.Id&&(serverUrl=getServerAddress(server,server.LastConnectionMode))&&this._getOrAddApiClient(server,serverUrl)}return this._apiClients}},{key:"getApiClient",value:function(item){if(!item)throw new Error("item or serverId cannot be null");var serverId=(serverId=item.ServerId)||(item.Id&&"Server"===item.Type?item.Id:item);if(serverId&&(apiClient=this._apiClientsMap[serverId]))return apiClient;for(var apiClients=this._apiClients,i=0,length=apiClients.length;i<length;i++){var apiClient,apiClientServerId=(apiClient=apiClients[i]).serverId();if(!apiClientServerId||apiClientServerId===serverId)return apiClient}return null}},{key:"getEmbyServerUrl",value:function(baseUrl,handler,params){return _apiclient.default.getUrl(handler,params,baseUrl)}},{key:"reportCapabilities",value:function(apiClient){return(_servicelocator.appHost.getSyncProfile?_servicelocator.appHost.getSyncProfile():Promise.resolve(null)).then(function(deviceProfile){var caps={PlayableMediaTypes:["Audio","Video"],SupportedCommands:["MoveUp","MoveDown","MoveLeft","MoveRight","PageUp","PageDown","PreviousLetter","NextLetter","ToggleOsd","ToggleContextMenu","Select","Back","SendKey","SendString","GoHome","GoToSettings","VolumeUp","VolumeDown","Mute","Unmute","ToggleMute","SetVolume","SetAudioStreamIndex","SetSubtitleStreamIndex","RefreshMediaSource","DisplayContent","GoToSearch","DisplayMessage","SetRepeatMode","SetSubtitleOffset","SetPlaybackRate","ChannelUp","ChannelDown","PlayMediaSource","PlayTrailers"],SupportsMediaControl:!0};return caps.DeviceProfile=deviceProfile,caps.IconUrl=_servicelocator.appHost.deviceIconUrl?_servicelocator.appHost.deviceIconUrl():null,caps.SupportsSync=_servicelocator.appHost.supports("sync"),caps.SupportsContentUploading=_servicelocator.appHost.supports("cameraupload"),caps=_servicelocator.appHost.getPushTokenInfo?Object.assign(caps,_servicelocator.appHost.getPushTokenInfo()):caps}).then(function(capabilities){return apiClient.reportCapabilities(capabilities)})}},{key:"getSignedInUsers",value:function(apiClient){for(var server,credentials=_credentials.default.credentials(),serverId=apiClient.serverId(),servers=credentials.Servers.slice(0),i=0,length=servers.length;i<length;i++)if(servers[i].Id===serverId){server=servers[i];break}if(!server)return Promise.resolve([]);for(var users=(server.Users||[]).slice(0),promises=[],_i2=0,_length2=users.length;_i2<_length2;_i2++)promises.push(getUserRecordFromAuthentication(users[_i2],apiClient));return Promise.all(promises).then(function(responses){for(var usersResult=[],_i3=0,_length3=responses.length;_i3<_length3;_i3++)responses[_i3]&&usersResult.push(responses[_i3]);return usersResult})}},{key:"validateCanChangeToUser",value:function(apiClient,userId){for(var server,credentials=_credentials.default.credentials(),serverId=apiClient.serverId(),servers=credentials.Servers.slice(0),i=0,length=servers.length;i<length;i++)if(servers[i].Id===serverId){server=servers[i];break}if(!server)return Promise.reject();for(var user,users=(server.Users||[]).slice(0),_i4=0,_length4=users.length;_i4<_length4;_i4++)if(users[_i4].UserId===userId){user=users[_i4];break}return user?validateAuthentication(this,server,user,apiClient.serverAddress()).catch(function(err){return _credentials.default.addOrUpdateServer(credentials.Servers,server)&&_credentials.default.credentials(credentials),Promise.reject(err)}):Promise.reject()}},{key:"changeToUser",value:function(apiClient,userId){var instance=this;return this.validateCanChangeToUser(apiClient,userId).then(function(){for(var server,credentials=_credentials.default.credentials(),serverId=apiClient.serverId(),servers=credentials.Servers.slice(0),i=0,length=servers.length;i<length;i++)if(servers[i].Id===serverId){server=servers[i];break}if(!server)return Promise.reject();for(var user,users=(server.Users||[]).slice(0),_i5=0,_length5=users.length;_i5<_length5;_i5++)if(users[_i5].UserId===userId){user=users[_i5];break}return user?getUserRecordFromAuthentication(user,apiClient).then(function(fullUserFromServer){return onAuthenticated.call(instance,apiClient,{ServerId:serverId,User:fullUserFromServer,AccessToken:user.AccessToken})}):Promise.reject()})}}])}();_exports.default=new ConnectionManager});