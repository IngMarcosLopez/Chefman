/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 *
 * Script Description
 *
 */
define(['N/record','N/search', 'N/runtime', 'N/email', 'N/file', 'N/task', 'N/sftp', 'N/error'],
    function(record, search,  runtime, email, file, task, sftp, error){

        var CONNECTION;

        const FILE_ID_SB = 0;
        const SEARCH_ID_SB = 0;
        const FILE_ID_PROD = 41493;
        const SEARCH_ID_PROD = 2533; // All - 1678 // Costco - 2533

        var testMode = false;

        function execute(){
            try {

                testMode = runtime.getCurrentScript().getParameter({
                    name: 'custscript_sps_sftp_test_mode'
                });

                savedSearchId = runtime.getCurrentScript().getParameter({
                    name: 'custscript_saved_search'
                });
                log.debug('savedSearchId', savedSearchId);

                CONNECTION = getSFTPConnection();
                var fileId;
                var savedSearchId;

                if (runtime.envType == 'SANDBOX'){
                    fileId = FILE_ID_SB;
                }else if (runtime.envType == 'PRODUCTION'){
                    fileId = FILE_ID_PROD;
                }
                
                if(!savedSearchId){
                    if (runtime.envType == 'SANDBOX'){
                        fileId = FILE_ID_SB;
                        savedSearchId = SEARCH_ID_SB;
                    }
                    else if (runtime.envType == 'PRODUCTION'){
                        fileId = FILE_ID_PROD;
                        savedSearchId = SEARCH_ID_PROD;
                    }
                }

                var searchTask = task.create({
                    taskType: task.TaskType.SEARCH,
                    fileId: fileId,
                    savedSearchId: savedSearchId
                });

                var searchTaskId = searchTask.submit();

                log.debug('Search Task ID', searchTaskId);

                var csvFile = file.load({
                    id: fileId
                });

                var csvFileName = 'Chefman Invoices ' + new Date().toString() + '.csv';
                csvFileName = csvFileName.replace(/-| |:/g, '_');
                csvFileName = csvFileName.replace(/\(|\)/g, '');

                csvFile.name = csvFileName;

                var sftpFolder;

                if (runtime.envType == 'SANDBOX' || (runtime.envType == 'PRODUCTION' && testMode)){
                    sftpFolder = '/testin';

                }
                else if (runtime.envType == 'PRODUCTION'){
                    sftpFolder = '/in';
                }

                log.debug('Uploading File to SPS SFTP Folder', sftpFolder);

                if (CONNECTION) {
                    CONNECTION.upload({
                        file: csvFile,
                        directory: sftpFolder,
                        replaceExisting: true
                    });

                    log.debug('Finished Loading File to SPS SFTP');
                }
                else {
                    throw 'Connection to SPS SFTP failed';
                }


            }
            catch (error){
                log.error('An error occurred in execute.', error);
            }
        }

        /**
         [sftp.spscommerce.com]:10022 ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAIEArf+qAWQRqqN/SvNR9uk5PtwHRsTf7UFqQau7n9XuRZhLY9mum4hzEqdPh3N+wGhV5PpjqucnNpm2VGED7n4zqRStGHInjNFocRllTvcCQiovZKKhCJII++mNEfWblBV+8jSydrzXk4BdLRpvqynb8CT/APnxyycMOLr+C/tLy7U=
         [sftp.spscommerce.com]:10022 ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBJHfYxzdsXszEam2PQdRgRRMyHEnk8ibgpiRjBsIMfzm2Xb2bZOYx5jiLIpchjaI28WDdk3gvpGkZqGNiZnaw5s=
         [sftp.spscommerce.com]:10022 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKLzLt2DFeZmrAXCmq/LzWbeDxF3YzWDcVnnXoS6nMcz

         */
        function getSFTPConnection () {

            try {
                // Get Paramters
                var username;
                var keyId;
                var guid;
                var url;
                var port;
                var hostKey;
                var hostKeyType;

                log.debug('Test Mode', testMode);

                if (runtime.envType == 'SANDBOX' || (runtime.envType == 'PRODUCTION' && testMode)){
                    username = 'rjbrandsnw';
                    guid = '96cd653586bf45649aa23a7db67687be';
                    //keyId = '';
                    url = 'sftp.spscommerce.com';
                    port = 10022;
                    hostKey = 'AAAAB3NzaC1yc2EAAAABIwAAAIEArf+qAWQRqqN/SvNR9uk5PtwHRsTf7UFqQau7n9XuRZhLY9mum4hzEqdPh3N+wGhV5PpjqucnNpm2VGED7n4zqRStGHInjNFocRllTvcCQiovZKKhCJII++mNEfWblBV+8jSydrzXk4BdLRpvqynb8CT/APnxyycMOLr+C/tLy7U=';
                    hostKeyType = 'RSA';
                }
                else {
                    username = 'rjbrandsnw';
                    guid = '96cd653586bf45649aa23a7db67687be';
                    //keyId = '';
                    url = 'sftp.spscommerce.com';
                    port = 10022;
                    hostKey = 'AAAAB3NzaC1yc2EAAAABIwAAAIEArf+qAWQRqqN/SvNR9uk5PtwHRsTf7UFqQau7n9XuRZhLY9mum4hzEqdPh3N+wGhV5PpjqucnNpm2VGED7n4zqRStGHInjNFocRllTvcCQiovZKKhCJII++mNEfWblBV+8jSydrzXk4BdLRpvqynb8CT/APnxyycMOLr+C/tLy7U=';
                    hostKeyType = 'RSA';
                }

                log.debug("Script parameters: ",
                    "username -> " + username +
                    " guid -> " + guid +
                    " port -> " + port +
                    " hostKey -> " + hostKey +
                    " hostKeyType -> " + hostKeyType
                );

                // Creates connection to the SFTP Site
                return sftp.createConnection({
                    username: username,
                    passwordGuid: guid,
                    url: url,
                    port: port,
                    hostKey: hostKey,
                    hostKeyType: hostKeyType
                });
            }
            catch (error) {
                log.error('An error occurred in getSFTPConnection', error);
            }
        }

        function getAllSearchResult(searchObject) {
            var pages = searchObject.runPaged({ pageSize: 1000 });
            var result = [];
            for (var pageIndex = 0; pageIndex < pages.pageRanges.length; pageIndex += 1) {
                var singlePage = pages.fetch({ index: pageIndex });
                for (var lineIndex = 0; lineIndex < singlePage.data.length; lineIndex += 1) {
                    result.push(singlePage.data[lineIndex]);
                }
            }
            return result;
        }

        return {
            execute: execute
        };
    });