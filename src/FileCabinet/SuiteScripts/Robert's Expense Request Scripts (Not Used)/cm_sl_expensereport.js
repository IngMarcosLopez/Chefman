/**
*
* @NApiVersion 2.1
* @NScriptType Suitelet
*
*/

define(['N/https', 'N/record', 'N/search', 'N/runtime', 'N/file', 'N/ui/serverWidget', 'N/encode'],

    function callbackFunction(https, record, search, runtime, file, ui, encode) {

        function getDepartments() {

            var departmentArray = [];
            var departmentSearchObj = search.create({
                type: "department",
                filters:
                    [
                        ["isinactive", "is", "F"]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC,
                            label: "Name"
                        })
                    ]
            });
            var searchResultCount = departmentSearchObj.runPaged().count;
            log.debug("departmentSearchObj result count", searchResultCount);
            departmentSearchObj.run().each(function (result) {

                departmentArray.push({
                    name: result.getValue({
                        name: "name",
                    }),
                    value: result.id
                })

                return true;
            });

            return departmentArray

        }

        function getFunction(context) {

            var headerCount = 0, departmentArray = getDepartments();

            var form = ui.createForm({
                title: '<h1 style="text-align: left; margin-left: 55px" >Chefman Expense Request</h1>',
                hideNavBar: true
            });

            form.clientScriptModulePath = 'SuiteScripts/cm_ce_expensereport.js';

            if (headerCount == 0) {

                var hiddenField = form.addField({
                    id: 'custpage_hidden',
                    label: '<span style="color:white"> test</span>',
                    type: ui.FieldType.LABEL
                })


                hiddenField.updateBreakType({
                    breakType: ui.FieldBreakType.STARTCOL
                });

            }


            var customrecord_cm_expensereportSearchObj = search.create({
                type: "customrecord_cm_expensereport",
                filters:
                    [
                        ["internalid", "anyof", "1"]

                    ],
                columns:
                    [

                        search.createColumn({ name: "custrecord_cm_firstname", label: "First Name" }),
                        search.createColumn({ name: "custrecord_cm_lastname", label: "Last Name" }),
                        search.createColumn({ name: "custrecord_cm_email", label: "Email" }),
                        search.createColumn({ name: "custrecord_cm_amount", label: "Amount" }),// header
                        search.createColumn({ name: "custrecord_cm_vendorname", label: "VENDOR NAME/EXPENSE" }),//footer
                        search.createColumn({ name: "custrecord_cm_whatistheexpense", label: "WHAT IS THE EXPENSE?" }),
                        search.createColumn({ name: "custrecord_cm_listcompetingquotes", label: " LIST COMPETING QUOTES " }),
                        search.createColumn({ name: "custrecord_cm_describewhyexpenseneeded", label: "DESCRIPTION OF REASON FOR EXPENSE:" }),
                    ]
            });
            var searchResultCount = customrecord_cm_expensereportSearchObj.runPaged().count;
            log.debug("customrecord_cm_expensereportSearchObj result count", searchResultCount);
            customrecord_cm_expensereportSearchObj.run().each(function (result) {
                // .run().each has a limit of 4,000 results

                if (headerCount == 0) {

                    for (var column in result.columns) {



                        var field = form.addField({
                            id: result.columns[column].name.replace('custrecord', 'custpage'),
                            label: result.columns[column].label,
                            type: headerCount > 3 ? ui.FieldType.TEXTAREA : result.columns[column].name == 'custrecord_cm_amount' ? ui.FieldType.CURRENCY : ui.FieldType.TEXT
                        }).updateDisplayType({
                            displayType: ui.FieldDisplayType.ENTRY
                        })

                        field.isMandatory = true;

                        if (result.columns[column].name == 'custrecord_cm_listcompetingquotes') {
                            field.defaultValue = 'Name: Amount: Description: \n1. \n2. \n3.'
                        }


                        if (headerCount == 3) {
                            var departmentFilters = form.addField({
                                id: 'custpage_department',
                                type: ui.FieldType.SELECT,
                                label: 'Select Department Requesting Expense'
                            });


                            for (var i = 0; i < departmentArray.length; i++) {

                                departmentFilters.addSelectOption({
                                    value: departmentArray[i].value,
                                    text: departmentArray[i].name
                                });
                            }


                        }

                        if (headerCount == 0) {

                            field.updateBreakType({
                                breakType: ui.FieldBreakType.STARTCOL
                            });


                        }

                        headerCount++

                    }


                    var fileField = form.addField({
                        id: 'custpage_submit_button',
                        type: ui.FieldType.INLINEHTML,
                        label: ' '
                    }).defaultValue = '<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td align="left" style="padding-top:30px" class="uir-secondary-buttons"><table border="0" cellspacing="0" cellpadding="0" role="presentation"><tbody><tr><td>'
                    + '<table id="tbl_secondarysubmitter" cellpadding="0" cellspacing="0" border="0" class="uir-button" style="margin-left:0px; margin-right:6px;cursor:hand;" role="presentation">'
                    + '<tbody><tr id="tr_secondarysubmitter" class="pgBntG pgBntB"> <td id="tdleftcap_secondarysubmitter"><img src="/images/nav/ns_x.gif" class="bntLT" border="0" height="50%" width="3" alt="">'
                    + ' <img src="/images/nav/ns_x.gif" class="bntLB" border="0" height="50%" width="3" alt="">         </td>        <td id="tdbody_secondarysubmitter" height="20" valign="top" nowrap="" class="bntBgB">'
                    + '<input type="submit" style="" class="rndbuttoninpt bntBgT" value="Submit" data-nsps-type="button" data-nsps-label="Submit" id="submitter" name="submitter" onmousedown="this.setAttribute(\'_mousedown\',\'T\'); setButtonDown(true, false, this);" onmouseup="this.setAttribute(\'_mousedown\',\'F\'); setButtonDown(false, false, this);" onmouseout="if(this.getAttribute(\'_mousedown\')==\'T\') setButtonDown(false, false, this);" onmouseover="if(this.getAttribute(\'_mousedown\')==\'T\') setButtonDown(true, false, this);" _mousedown="T"></td>'
                    + ' <td id="tdrightcap_secondarysubmitter"> <img src="/images/nav/ns_x.gif" height="50%" class="bntRT" border="0" width="3" alt="">            <img src="/images/nav/ns_x.gif" height="50%" class="bntRB" border="0" width="3" alt="">        </td></tr>    </tbody></table>'
                        + '</td> </tr>  </tbody></table> </td></tr></tbody></table>'


                    for (var i = 0; i < 3; i++) {
                        var fileField = form.addField({ id: 'custpage_file_' + i, type: ui.FieldType.FILE, label: 'Competing Vendor Quote ' + ' (If Available) Choose file to import' })

                        if (i == 0) {
                            fileField.updateLayoutType({
                                layoutType: ui.FieldLayoutType.STARTROW
                            });


                            fileField.updateBreakType({
                                breakType: ui.FieldBreakType.STARTCOL
                            });
                        }
                    }


                    var fileField = form.addField({
                        id: 'custpage_file_3',
                        type: ui.FieldType.INLINEHTML,
                        label: ' '
                    }).defaultValue = '<h1 style="color:black; padding-top: 10px; font-size: 12px; text-transform: uppercase; font-family: Open Sans,Helvetica,sans-serif"><span style="color:black">Preferred Vendor Quote (If Available) Choose file to import</span></h1><input  setWindowChanged(window, true); id="custpage_file_3" placeholder="PreferredFile" name="custpage_file_3" type="file">'



                    return false;

                }

            });

            context.response.writePage(form);

        }

        function getFileType(sentFileType) {

            switch (sentFileType) {
                case '.jpg':
                    return file.Type.JPGIMAGE
                case '.gif':
                    return file.Type.GIFIMAGE
                case '.bmp':
                    return file.Type.BMPIMAGE
                case '.png':
                    return file.Type.PNGIMAGE
                case '.xls':
                    return file.Type.EXCEL
                case '.xlsx':
                    return file.Type.EXCEL
                case '.csv':
                    return file.Type.CSV
                case '.doc':
                    return file.Type.WORD
                case '.docx':
                    return file.Type.WORD
                case '.pdf':
                    return file.Type.PDF
            }
            return file.Type.PLAINTEXT;
        }


        function postFunction(context) {

            log.debug({
                title: 'parameteres',
                details: JSON.stringify((context.request.parameters))
            });

            log.debug({
                title: 'parameteres',
                details: JSON.stringify((context.request.files))
            });

            var expenseRecord = record.create({
                type: 'customrecord_cm_expensereport',
                isDynamic: false,
            });

            expenseRecord.setValue({
                fieldId: 'custrecord_cm_department',
                value: context.request.parameters['custpage_department'],
                ignoreFieldChange: false
            });

            expenseRecord.setValue({
                fieldId: 'custrecord_cm_firstname',
                value: context.request.parameters['custpage_cm_firstname'],
                ignoreFieldChange: false
            });

            expenseRecord.setValue({
                fieldId: 'custrecord_cm_lastname',
                value: context.request.parameters['custpage_cm_lastname'],
                ignoreFieldChange: false
            });

            expenseRecord.setValue({
                fieldId: 'custrecord_cm_email',
                value: context.request.parameters['custpage_cm_email'],
                ignoreFieldChange: false
            });

            expenseRecord.setValue({
                fieldId: 'custrecord_cm_amount',
                value: context.request.parameters['custpage_cm_amount'],
                ignoreFieldChange: false
            });

            expenseRecord.setValue({
                fieldId: 'custrecord_cm_vendorname',
                value: context.request.parameters['custpage_cm_vendorname'],
                ignoreFieldChange: false
            });

            expenseRecord.setValue({
                fieldId: 'custrecord_cm_whatistheexpense',
                value: context.request.parameters['custpage_cm_whatistheexpense'],
                ignoreFieldChange: false
            });

            expenseRecord.setValue({
                fieldId: 'custrecord_cm_listcompetingquotes',
                value: context.request.parameters['custpage_cm_listcompetingquotes'],
                ignoreFieldChange: false
            });

            expenseRecord.setValue({
                fieldId: 'custrecord_cm_describewhyexpenseneeded',
                value: context.request.parameters['custpage_cm_describewhyexpenseneeded'],
                ignoreFieldChange: false
            });

            var saveID = expenseRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug({
                title: 'saveID',
                details: saveID
            });

            if (context.request.files) {

                var fileFields = ['custpage_file_0', 'custpage_file_1', 'custpage_file_2', 'custpage_file_3']

                for (var i = 0; i < fileFields.length; i++) {

                    var context_file = context.request.files[fileFields[i]];

                    if (context_file) {

                        var file_data = context_file.getContents();

                        log.debug('file_data', file_data)

                        var fileTypeIndex = context_file.name.indexOf('.');
                        log.debug('fileTypeIndex', fileTypeIndex)
                        var sentFileType = context_file.name.substring(fileTypeIndex, context_file.name.length)
                        log.debug('sentFileType', sentFileType)

                        var fileObj = file.create({
                            name: i < 3 ? 'Competing_' + context_file.name : 'Preferred_' + context_file.name,
                            fileType: getFileType(sentFileType),
                            contents: file_data,
                            folder: -15,

                        });

                        log.debug('getFileType', getFileType(sentFileType))


                        var fileID = fileObj.save();

                        log.debug({
                            title: 'fileID',
                            details: fileID
                        });


                        record.attach({
                            record: {
                                type: 'file',
                                id: fileID
                            },
                            to: {
                                type: 'customrecord_cm_expensereport',
                                id: saveID
                            },
                        });

                    }

                }

            }

            record.submitFields({
                type: 'customrecord_cm_expensereport',
                id: saveID,
                values: {
                    custrecord_cm_sendinitialemail: true
                },
            })

            var scriptObj = runtime.getCurrentScript();

            var completeFormURL = scriptObj.getParameter({ name: 'custscript_cm_completeformtemplate' });

            var contentRequest = https.get({
                url: completeFormURL
            });

            var contentDocument = contentRequest.body.replace('${expensereport}', saveID);

            context.response.write(contentDocument);


        }




        function onRequestFxn(context) {

            try {
                if (context.request.method === "GET") {
                    getFunction(context)
                }
                else {
                    postFunction(context)
                }
            } catch (error) {
                log.error('Error', error)
            }


        }
        return {
            onRequest: onRequestFxn
        };
    });

