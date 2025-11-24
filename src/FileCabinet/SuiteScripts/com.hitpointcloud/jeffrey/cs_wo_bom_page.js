/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * Author       Jeffrey
 * Date         2023/5/12
 * Task         加工领料
 */
define(['N/currentRecord', 'N/record', 'N/search', 'N/url','./utils_func.js'],
/**
 * @param{currentRecord} currentRecord
 * @param{record} record
 * @param{search} search
 * @param{url} url
 */
function(currentRecord, record, search, url,func) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */


    function pageInit(scriptContext) {

    }

    //取url上参数的值
    function getParam(paramName) {
        var paramValue = "";
        var isFound = !1;
        if (this.top.location.search.indexOf("?") == 0 && this.top.location.search.indexOf("=") > 1) {
            var arrSource = unescape(this.top.location.search).substring(1, this.top.location.search.length).split("&");
            var i = 0;

            while (i < arrSource.length && !isFound)
                arrSource[i].indexOf("=") > 0 && arrSource[i].split("=")[0].toLowerCase() == paramName.toLowerCase() && (paramValue = arrSource[i].split("=")[1], isFound = !0), i++

        }

        return paramValue == "" && (paramValue = null), paramValue

    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        var curRec = scriptContext.currentRecord;
        var fieldId = scriptContext.fieldId;
        var wo_num = curRec.getValue("custpage_body_wo_num");
        var location = curRec.getValue("custpage_body_location");
       if(fieldId == 'custpage_body_location'){
           if(location != '' && wo_num.length > 0 && wo_num[0] != ''){
               console.log("hh")
               var flag = getLocation(wo_num,location)
               if(!flag){
                   curRec.setValue({fieldId:"custpage_body_location",value:""})
                   curRec.setValue({fieldId:"custpage_body_location_text",value:""})
               }

           }
           curRec.setValue({fieldId:"custpage_body_location_text",value:curRec.getText("custpage_body_location")})

       }
        if(fieldId == 'custpage_body_wo_num'){
            if(location != '' && wo_num.length > 0 && wo_num[0] != ''){
                console.log("ss")
                var flag = getLocation(wo_num,location)
                if(!flag){
                    curRec.setValue({fieldId:"custpage_body_wo_num",value:""})
                    curRec.setValue({fieldId:"custpage_body_wo_num_text",value:""})
                }



            }
            var wo_num_text = curRec.getText("custpage_body_wo_num");
            console.log("wo_num_text",wo_num_text)
            if(wo_num_text.length > 0 && wo_num_text[0] != ''){
                var str = ''
                for(var index = 0 ; index < wo_num_text.length;index ++){
                    str += wo_num_text[index].substr(4)
                    if(index < wo_num_text.length -1){
                        str += ','
                    }
                }
                curRec.setValue({fieldId:"custpage_body_wo_num_text",value:str})
            }else {
                curRec.setValue({fieldId:"custpage_body_wo_num_text",value:''})
            }



        }


    }

    function getLocation(wo_num,location) {
        var workorderSearchObj = search.create({
            type: "workorder",
            filters:
                [
                    ["type","anyof","WorkOrd"],
                    "AND",
                    ["internalid","anyof",wo_num],
                    "AND",
                    ["mainline","is","T"]
                ],
            columns:
                [
                    search.createColumn({name: "location", label: "地点"}),
                ]
        });
        var searchData = func.getAllSearchData(workorderSearchObj);
        if(searchData.length == wo_num.length){
            for(var index = 0 ; index < searchData.length;index ++){
                var s_location = searchData[index].getValue("location");
                if(s_location == ''){
                    alert("请选择工单中存在的地点")
                    return false
                }else {
                    if(location != s_location){
                        alert("所选工单中的地点不一致，不支持调拨计算")
                        return false
                    }
                }
            }

        }else {
            alert("请选择工单中存在的地点")
            return false
        }
        return true
    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    function searchData() {
        var cur_rec = currentRecord.get();
        var nowUrl = window.location.href;
        var searchField = [
            {id:"custpage_body_wo_num",type:"multiselect",label:"工单号",container:"selectgroup",source:"workorder"},
            {id:"custpage_body_wo_status",type:"select",label:"工单状态",container:"selectgroup"},
            {id:"custpage_body_location",type:"select",label:"仓库",container:"selectgroup",source:"location"},
            {id:"custpage_body_location_type",type:"select",label:"仓库类型",container:"selectgroup",source:"customlist_hc_location_type"},
            {id:"custpage_body_wo_num_text",type:"text",label:"工单号text",container:"selectgroup"},
            {id:"custpage_body_location_text",type:"text",label:"仓库text",container:"selectgroup"},
        ]
        var null_arr = []
        for (var i = 0; i < searchField.length; i++) {
            var thisValue = cur_rec.getValue({fieldId: searchField[i].id});
            if(searchField[i].id == 'custpage_body_wo_num' || searchField[i].id == 'custpage_body_location' ||searchField[i].id == 'custpage_body_location_type' ){
                if(thisValue == ""){
                    null_arr.push(searchField[i].label)
                }
            }
            thisValue = encodeURIComponent(thisValue);         //将字符串作为URI进行编码
            nowUrl = changeURLArg(nowUrl, searchField[i].id, thisValue);            //改变地址栏上URL的值
        }
        if(null_arr.length > 0){
            let str = "请输入值：" + null_arr
            alert(str)
            return;
        }
        setWindowChanged(window, false);
        window.location.href = nowUrl;

    }

    //改变url的值
    function changeURLArg(url, arg, arg_val) {
        //console.log('Transfer customer CS ','changeURLArg');
        var pattern = arg + '=([^&]*)';
        var replaceText = arg + '=' + arg_val;
        if (url.match(pattern)) {
            var tmp = '/(' + arg + '=)([^&]*)/gi';
            tmp = url.replace(eval(tmp), replaceText);
            return tmp;
        } else {
            if (url.match('[\?]')) {
                return url + '&' + replaceText;
            } else {
                return url + '?' + replaceText;
            }
        }
    }

    return {
        pageInit: pageInit,
        searchData:searchData,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // sublistChanged: sublistChanged,
        // lineInit: lineInit,
        // validateField: validateField,
        // validateLine: validateLine,
        // validateInsert: validateInsert,
        // validateDelete: validateDelete,
        //saveRecord: saveRecord
    };
    
});
