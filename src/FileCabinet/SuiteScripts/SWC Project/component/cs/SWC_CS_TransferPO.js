/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */

define(['N/currentRecord', 'N/record', 'N/search', "N/url", 'N/https'],
    /**
     * @param{currentRecord} currentRecord
     * @param{record} record
     * @param{search} search
     */


    function (currentRecord, record, search, url, https) {

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
            // 关闭”加载中，请稍候 ...“遮罩
            var oDiv = document.getElementById("timeoutblocker");
            oDiv.style.display = "none";

            // var a = url.resolveRecord({recordType:"purchaseorder",recordId:"408",isEditMode:false});
            // alert(a)
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
            debugger;
            var curRec = scriptContext.currentRecord;
            var subsidiary = curRec.getValue({fieldId:"custpage_subsidiary"}); // 表头subsidiary
            // 如果表头供应商变了 给所有的表行供应商变更为表头一样
            if(scriptContext.fieldId == "custpage_vendor") {
                var vendorBody = curRec.getValue({fieldId:"custpage_vendor"});
                var selectedVendorJson = curRec.getValue({fieldId:"custpage_itemvendorprice"});
                selectedVendorJson = JSON.parse(selectedVendorJson);

                var count = curRec.getLineCount({sublistId:"custpage_sublist"});
                if(vendorBody) {
                    for(var i = 0; i < count; i++) {
                        var itemCost = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_purchasecost",line:i});
                        var itemId = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_itemid",line:i});
                        if(selectedVendorJson.hasOwnProperty(itemId) && selectedVendorJson[itemId].hasOwnProperty(vendorBody+"_"+subsidiary)) {
                            var subRecord = curRec.selectLine({sublistId: 'custpage_sublist', line: i});           // 当前行对象
                            subRecord.setCurrentSublistValue({sublistId:"custpage_sublist",fieldId:"custbody_untaxrate",value:selectedVendorJson[itemId][vendorBody+"_"+subsidiary]});
                            subRecord.commitLine({sublistId:"custpage_sublist"})
                        } else if(itemCost) {
                            var subRecord = curRec.selectLine({sublistId: 'custpage_sublist', line: i});           // 当前行对象
                            curRec.setCurrentSublistValue({sublistId:"custpage_sublist",fieldId:"custbody_untaxrate",value:itemCost});
                            subRecord.commitLine({sublistId:"custpage_sublist"})
                        }
                        curRec.commitLine({sublistId:"custpage_sublist"});
                    }
                } else {
                    for(var i = 0; i < count; i++) {
                        curRec.selectLine({sublistId:"custpage_sublist",line:i});
                        curRec.setCurrentSublistValue({sublistId:"custpage_sublist",fieldId:"custbody_untaxrate",value:0});
                        curRec.commitLine({sublistId:"custpage_sublist"});
                    }
                }
            }

            // // 表行供应商变了。去查询 PURCHASE PRICE NO TAX
            // if(scriptContext.sublistId == "custpage_sublist" && scriptContext.fieldId == "custpage_vendor_sub") {
            //     var lineNum = curRec.getCurrentSublistIndex({sublistId:'custpage_sublist'});                 // 行号
            //     var selectedVendorJson = curRec.getValue({fieldId:"custpage_itemvendorprice"});
            //     selectedVendorJson = JSON.parse(selectedVendorJson);
            //     var vendorSublist = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_vendor_sub",line:lineNum});
            //     var itemCost = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_purchasecost",line:lineNum});
            //     var itemId = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_itemid",line:lineNum});
            //     if(vendorSublist) {
            //         if(selectedVendorJson.hasOwnProperty(itemId) && selectedVendorJson[itemId].hasOwnProperty(vendorSublist+"_"+subsidiary)) {
            //
            //             var subRecord = curRec.selectLine({sublistId: 'custpage_sublist', line: lineNum});           // 当前行对象
            //             subRecord.setCurrentSublistValue({sublistId:"custpage_sublist",fieldId:"custbody_untaxrate",value:selectedVendorJson[itemId][vendorSublist+"_"+subsidiary]});
            //             subRecord.commitLine({sublistId:"custpage_sublist"})
            //         } else if(itemCost) {
            //             var subRecord = curRec.selectLine({sublistId: 'custpage_sublist', line: lineNum});           // 当前行对象
            //             curRec.setCurrentSublistValue({sublistId:"custpage_sublist",fieldId:"custbody_untaxrate",value:itemCost});
            //             subRecord.commitLine({sublistId:"custpage_sublist"})
            //         }
            //     } else {
            //         var subRecord = curRec.selectLine({sublistId: 'custpage_sublist', line: lineNum});           // 当前行对象
            //         curRec.setCurrentSublistValue({sublistId:"custpage_sublist",fieldId:"custbody_untaxrate",value:0});
            //         subRecord.commitLine({sublistId:"custpage_sublist"})
            //     }
            // }


        }

        /**
         * 生成PO按钮
         * @param scriptContext
         */
        function submitFunc(scriptContext) {
            var oDiv1 = document.getElementById("timeoutblocker");
            var curRec = currentRecord.get();
            var dataJson = {}; // 总数据

            var soDocNo = curRec.getValue({fieldId:"custpage_salesorder"});// 销售订单号
            var vendor = curRec.getValue({fieldId:"custpage_vendor"});// 供应商
            var subsidiary = curRec.getValue({fieldId:"custpage_subsidiary"});// 子公司
            var currency = curRec.getValue({fieldId:"custpage_currency"});// 货币
            var soId = curRec.getValue({fieldId:"custpage_soid"});// soid
            var location = curRec.getValue({fieldId:"custpage_location"});// 地点

            // 选择了行没选择供应商提交
            if(!vendor) {
                alert('Select a line without a vendor!');
                return false;
            }

            dataJson["soDocNo"] = soDocNo;
            dataJson["subsidiary"] = subsidiary;
            dataJson["currency"] = currency;
            dataJson["soId"] = soId;
            dataJson["location"] = location;
            dataJson["sublistArr"] = [];

            var sublistJson = {}; // 按照供应商分组创建po
            var count = curRec.getLineCount({sublistId:"custpage_sublist"});
            var ckFlag = false; // 判断是否选择行

            for(var i = 0; i < count; i++) {
                var ck = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_ck",line:i});
                // var vendor = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_vendor_sub",line:i});
                var itemId = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_itemid",line:i});
                var soLineId = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_lineid",line:i});
                var entryQty = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_entryquantity",line:i});
                var qty = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_quantity",line:i});
                var unit = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_unit",line:i});
                var unitid = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_unitid",line:i});
                var description = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custpage_description",line:i});
                var untaxrate = curRec.getSublistValue({sublistId:"custpage_sublist",fieldId:"custbody_untaxrate",line:i});

                if(ck) {
                    ckFlag = true;

                    // 不含税单价未填写提交
                    // if(!untaxrate || Number(untaxrate) == 0) {   
                    //    alert('The PURCHASE PRICE NO TAX is not filled in!');
                    //    return false;
                    // }
                    // 没填写数量
                    if(!entryQty || Number(entryQty) == 0) {
                        alert('Check the unfilled quantity!');
                        return false;
                    }
                    // 数量比需求数量大
                    if(Number(entryQty) > Number(qty)) {
                        alert('The quantity must not exceed the number of sales orders!');
                        return false;
                    }

                    sublistJson[vendor] = sublistJson[vendor] || [];
                    sublistJson[vendor].push({
                        "vendor":vendor,
                        "itemId":itemId,
                        "soLineId":soLineId,
                        "entryQty":entryQty,
                        "unit":unit,
                        "unitid":unitid,
                        "description":description,
                        "untaxrate":untaxrate
                    });
                }

            }

            dataJson["sublistArr"] = Object.values(sublistJson);
            // 一行数据没选提交
            if(!ckFlag) {
                alert('Submit without selecting a project!');
                return false;
            }

            var lhRkPromiseArr = [];

            var clickFlag = 0;
            if (clickFlag == 0) {
                clickFlag = 1;

                oDiv1.style.display = "block";
                // 取消提示框
                window.onbeforeunload = null;

                var counts = Math.ceil(dataJson["sublistArr"].length / 1); // 向上取证

                for(var i = 0; i < counts; i++) {
                    var errflag = false;
                    var printUrl = url.resolveScript({
                        scriptId: 'customscript_swc_sl_socreatepo',         //1、处理数据sl脚本的id
                        deploymentId: 'customdeploy_swc_sl_socreatepo',     //2. 处理数据sl脚本部署的id
                    });
                    lhRkPromiseArr.push(https.post.promise({
                        url: printUrl,
                        body: {'dataJson':JSON.stringify(dataJson),"page":(i+1),"pageSize":1} // 传递参数
                    }));

                }
                debugger;
                Promise.all(lhRkPromiseArr).then((response) => {
                    var messageArr = [];
                    var soLineIdQtyJson = {};
                    var poUrlArr = [];
                    for (var i = 0; i < response.length; i++) {
                        // console.log(response[i].body);
                        if (response[i].body) {
                            console.log(response[i].body)
                            messageArr.push(JSON.parse(response[i].body).resultArr);
                            poUrlArr.push(JSON.parse(response[i].body).poUrlArr);
                            soLineIdQtyJson = Object.assign(JSON.parse(response[i].body).soLineIdQtyJson,soLineIdQtyJson);
                        } else {
                            alert('The page data is incorrect, please check!')
                        }
                    }
                    if (messageArr.length) {
                        alert(messageArr.join("\n"));
                        // 回写本次solineid创建po的数量
                        var soRec = record.load({type:"salesorder",id:soId,isDynamic:true});
                        var count = soRec.getLineCount({sublistId:'item'});
                        for(var m = 0; m < count; m++) {
                            soRec.selectLine({sublistId:"item",line:m});
                            var soLineId = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"line"});
                            if(soLineIdQtyJson.hasOwnProperty(soLineId)) {
                                var poQty = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity"}) || 0;
                                var newQty = Number(soLineIdQtyJson[soLineId]) + Number(poQty);
                                soRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity",value:newQty < 0 ? 0 : newQty});
                                soRec.commitLine({sublistId:'item'});
                            }
                        }
                        soRec.save({enableSourcing:true,ignoreMandatoryFields:true});
                    }
                    if(poUrlArr.length) {
                        window.location.href = poUrlArr[0];
                    }
                    // window.location.reload();

                }).catch((error) => {
                    alert("Invalid Get Request: "+error)
                    oDiv1.style.display = "none";
                })

                jQuery("input[id^=custpage_submitbtn]").attr("disabled", true);
                setTimeout(function () {
                    clickFlag = 0;
                    jQuery("input[id^=custpage_submitbtn]").attr("disabled", false);
                }, 5000);
            } else {
                alert("Don't click all the time!");
            }
        }



        return {
            submitFunc: submitFunc,
            pageInit: pageInit,
            fieldChanged: fieldChanged
        };

    });
