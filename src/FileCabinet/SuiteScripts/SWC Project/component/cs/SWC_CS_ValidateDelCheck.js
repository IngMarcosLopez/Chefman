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
         * Validation function to be executed when record is deleted.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord -   form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @returns {boolean} Return true if sublist line is valid
         *
         * @since 2015.2
         */
        function validateDelete(scriptContext) {
            // var curRec = scriptContext.currentRecord;
            // if(scriptContext.sublistId == "item") {
            //     var soId = curRec.getValue({fieldId:"custbody_swc_so_num"});
            //     if(soId) {
            //         alert("Purchase order lines cannot be deleted!");
            //         return false;
            //     }
            // }
            return true;
        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be 3 if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {
            var curRec = scriptContext.currentRecord;
            if(scriptContext.sublistId == "item" && scriptContext.fieldId == "quantity") {
                var soId = curRec.getValue({fieldId:"custbody_swc_so_num"});
                if(soId) {
                    var lineNum = curRec.getCurrentSublistIndex({sublistId:'item'});                 // 行号
                    var newQty = curRec.getCurrentSublistValue({sublistId:"item",fieldId:"quantity"});
                    var oldQty = curRec.getCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_origin_qty"});
                    // alert("lineNum"+lineNum)
                    // alert("oldQty"+oldQty)
                    // alert("newQty"+newQty)
                    if(oldQty != newQty) {
                        var cha = Number(newQty) - Number(oldQty);
                        // alert("cha"+cha)
                        curRec.selectLine({sublistId:"item",line:lineNum});
                        curRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_differencevalue",value:cha});
                        // curRec.commitLine({sublistId:'item'})
                    }
                }

            }
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
            var curRec = scriptContext.currentRecord;
            var soLineIdQtyJson = {}; // so line id 和差值的json
            var soId = curRec.getValue({fieldId:"custbody_swc_so_num"});
            var soName = curRec.getText({fieldId:"custbody_swc_so_num"});
            var count = curRec.getLineCount({sublistId:"item"});
            var soLineIdArr = [];
            if(soId) {
                for(var i = 0; i < count; i++) {
                    var soLineId = curRec.getSublistValue({sublistId:"item",fieldId:"custcol_swc_so_lineid",line:i});
                    var cha = curRec.getSublistValue({sublistId:"item",fieldId:"custcol_swc_differencevalue",line:i});
                    if(cha) {
                        soLineIdArr.push(soLineId);
                        soLineIdQtyJson[soLineId] = cha;
                    }
                }
                // 保存有修改才校验
                if(soLineIdArr.length) {
                    var soRemainJson = getSoRemainJson(soId,soLineIdArr);
                    var errorMsg = "";
                    for(var solineid in soLineIdQtyJson) {
                        if(soRemainJson.hasOwnProperty(solineid)) {
                            if(Number(soLineIdQtyJson[solineid]) > Number(soRemainJson[solineid])) {
                                errorMsg += "The available quantity is "+(Number(soLineIdQtyJson[solineid]) - Number(soRemainJson[solineid]))
                                    +" less than the filled quantity for so line id "+solineid+"\n";
                            }
                        } else {
                            errorMsg += "The so line id :"+solineid+" has no available quantity!\n";
                        }
                    }
                    if(errorMsg) {
                        alert(errorMsg);
                        return false;
                    } else {
                        // 将初始数量开发用赋值为数量
                        for(var i = 0; i < count; i++) {
                            var qty = curRec.getSublistValue({sublistId:"item",fieldId:"quantity",line:i});
                            curRec.selectLine({sublistId:"item",line:i});
                            curRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_origin_qty",value:qty});
                            curRec.commitLine({sublistId:'item'})
                        }
                    }
                }
            }



            return true;
        }


        /**
         * 查询销售订单剩余的可开po数量
         * @param soId
         */
        function getSoRemainJson(soId,soLineIdArr) {
            var soRemainJson = {};
            var filters =[
                ["type","anyof","SalesOrd"],
                "AND",
                ["internalid","anyof",soId],
                "AND",
                ["mainline","is","F"],
                "AND",
                ["taxline","is","F"],
                "AND",
                ["itemtype","isnot","Group"],
                "AND",
                ["itemtype","isnot","EndGroup"]
            ]

            var fieldFilters = [];
            soLineIdArr.forEach(function (value, index) {
                if (index != 0) {
                    fieldFilters.push("OR");
                }
                fieldFilters.push(["line","equalto",value]);
            });
            if(fieldFilters.length) filters.push("AND",fieldFilters);

            var salesorderSearchObj = search.create({
                type: "salesorder",
                filters:filters,
                columns:
                    [
                        search.createColumn({name: "line", label: "Line ID"}),
                        search.createColumn({name: "quantity", label: "Quantity"}),
                        search.createColumn({name: "custcol_swc_poquantity", label: "Purchase quantity"})
                    ]
            });
            salesorderSearchObj.run().each(function(result) {
                var lineId = result.getValue({name: "line"});
                var qty = result.getValue({name: "quantity"});
                var poQty = result.getValue({name: "custcol_swc_poquantity"});
                soRemainJson[lineId] = Number(Math.abs(qty)) - Number(poQty);
                return true;
            });

            return soRemainJson;
        }



        return {
            validateDelete: validateDelete,
            fieldChanged: fieldChanged,
            saveRecord: saveRecord,
        };

    });
