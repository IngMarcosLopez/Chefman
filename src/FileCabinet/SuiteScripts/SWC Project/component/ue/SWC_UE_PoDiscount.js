/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record'],

    (record) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            if(scriptContext.type == "view") {
                var poRec = record.load({type:"purchaseorder",id:scriptContext.newRecord.id});
                var statusRef = poRec.getValue({fieldId:"statusRef"});
                var rewriteFlag = poRec.getValue({fieldId:"custbody_swc_checkbox"});
                if(statusRef == "closed" && !rewriteFlag) {
                    var soLineIdQtyJson = {};
                    var soId = poRec.getValue({fieldId:"custbody_swc_so_num"});
                    if(soId) {
                        log.debug("关闭触发回写so",soId)
                        var count = poRec.getLineCount({sublistId: "item"});
                        for(var i = 0; i < count; i++) {
                            var qty = poRec.getSublistValue({sublistId: "item", fieldId: "quantity", line: i}); // 数量
                            var soLineId = poRec.getSublistValue({sublistId: "item", fieldId: "custcol_swc_so_lineid", line: i}); // so行ID
                            soLineIdQtyJson[soLineId] = qty;
                        }
                        log.debug("soLineIdQtyJson",JSON.stringify(soLineIdQtyJson))
                        // 回写本次solineid创建po的数量
                        var soRec = record.load({type:"salesorder",id:soId,isDynamic:true});
                        var count = soRec.getLineCount({sublistId:'item'});
                        for(var m = 0; m < count; m++) {
                            soRec.selectLine({sublistId:"item",line:m});
                            var soLineId = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"line"});
                            if(soLineIdQtyJson.hasOwnProperty(soLineId)) {
                                var poQty = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity"}) || 0;
                                var newQty = Number(poQty) - Number(soLineIdQtyJson[soLineId]);
                                soRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity",value:newQty < 0 ? 0 : newQty});
                                soRec.commitLine({sublistId:'item'});
                            }
                        }
                        soRec.save({enableSourcing:true,ignoreMandatoryFields:true});

                        // 回写后勾选ck
                        poRec.setValue({fieldId:"custbody_swc_checkbox",value:true});
                        poRec.save();
                    }
                }
            }

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            var newRec = scriptContext.newRecord;
            var oldRec = scriptContext.oldRecord;
            if (scriptContext.type == "edit" || scriptContext.type == "create") {
                var newDisAmount = newRec.getValue({fieldId: "custbody_swc_discount_amount"}); // Discount Amount
                var newDisPercent = newRec.getValue({fieldId: "custbody_swc_discount_percent"})/100; // Discount Percent
                var oldDisAmount = "";
                var oldDisPercent = "";
                if (scriptContext.type != "create") {
                    oldDisAmount = oldRec.getValue({fieldId: "custbody_swc_discount_amount"}); // Discount Amount
                    oldDisPercent = oldRec.getValue({fieldId: "custbody_swc_discount_percent"})/100; // Discount Percent
                }
                log.audit('oldDisAmount ' + ' oldDisPercent', oldDisAmount + " " + oldDisPercent)
                log.audit('newDisAmount ' + ' newDisPercent', newDisAmount + " " + newDisPercent)
                var count = newRec.getLineCount({sublistId: "item"});
                // 1.输入custbody_swc_discount_amount时，能够在单据提交时计算custbody_swc_discount_percent，
                // 根据custbody_swc_discount_amount/amount(每行的amount之和），精度保留2位；
                if (newDisAmount && (newDisAmount != oldDisAmount || !newDisPercent)) {
                    var firrec = record.load({type: "purchaseorder", id: newRec.id, isDynamic: true});
                    var total = 0;
                    for (var i = 0; i < count; i++) {
                        var amount = newRec.getSublistValue({sublistId: "item", fieldId: "custcol_swc_original_price", line: i}); // Original Price
                        var qty = newRec.getSublistValue({sublistId: "item", fieldId: "quantity", line: i}); // 数量
                        total += ((amount*1) * (qty*1));
                    }
                    if (total > 0) {
                        var percent_value = ((newDisAmount*1) / (total*1) * 100);
                        log.audit('percent_value', percent_value)
                        // 3.根据单据提交时计算得出或填入的custbody_swc_discount_percent，
                        // 计算rate=custcol_swc_original_price-custbody_swc_discount_percent*custcol_swc_original_price；
                        for (var k=0; k<count; k++) {
                            var price = newRec.getSublistValue({sublistId: "item", fieldId: "custcol_swc_original_price", line: k}); // Original Price
                            var rate = (1-(percent_value/100*1)) * (price*1); // 价格
                            log.audit('rate', rate)
                            firrec.selectLine({sublistId: "item", line: k});
                            firrec.setCurrentSublistValue({sublistId: "item", fieldId: "rate", value: rate});
                            firrec.commitLine({sublistId: "item"});
                        }
                        firrec.setValue({fieldId: "custbody_swc_discount_percent", value: percent_value.toFixed(2)});
                    }
                    firrec.save();
                }
                // 2.输入custbody_swc_discount_percent时，能够在单据提交时计算custbody_swc_discount_amount，
                // 根据每行的custbody_swc_discount_percen*quantity*custcol_swc_original_price累加
                if (newDisPercent && (newDisPercent != oldDisPercent || !newDisAmount)) {
                    var secrec = record.load({type: "purchaseorder", id: newRec.id, isDynamic: true});
                    var amount_value = 0;
                    for (var j=0; j<count; j++) {
                        var price = newRec.getSublistValue({sublistId: "item", fieldId: "custcol_swc_original_price", line: j}); // Original Price
                        var qty = newRec.getSublistValue({sublistId: "item", fieldId: "quantity", line: j}); // 数量
                        var newAmount = (newDisPercent*1) * (price*1) * (qty*1);
                        amount_value += newAmount;
                        // 3.根据单据提交时计算得出或填入的custbody_swc_discount_percent，
                        // 计算rate=custcol_swc_original_price-custbody_swc_discount_percent*custcol_swc_original_price；
                        var rate = (1-(newDisPercent*1)) * (price*1); // 价格
                        log.audit('rate', rate)
                        secrec.selectLine({sublistId: "item", line: j});
                        secrec.setCurrentSublistValue({sublistId: "item", fieldId: "rate", value: rate});
                        secrec.commitLine({sublistId: "item"});
                    }
                    log.audit('amount_value', amount_value)
                    if (amount_value > 0) {
                        secrec.setValue({fieldId: "custbody_swc_discount_amount", value: amount_value});
                    }
                    secrec.save();
                }
                // 3、当编辑时百分比或折扣价格为空时，重新计算价格
                if (scriptContext.type == "edit") {
                    if (!newDisAmount && !newDisPercent) {
                        var tirrec = record.load({type: "purchaseorder", id: newRec.id, isDynamic: true});
                        for (var m=0; m<count; m++) {
                            var price = newRec.getSublistValue({sublistId: "item", fieldId: "custcol_swc_original_price", line: m}); // Original Price
                            tirrec.selectLine({sublistId: "item", line: m});
                            tirrec.setCurrentSublistValue({sublistId: "item", fieldId: "rate", value: price});
                            tirrec.commitLine({sublistId: "item"});
                        }
                        tirrec.save();
                    }
                }
            }
            // 20240407 zcg 新增根据差值去回写so数量 并且删除行也要回写数量
            if(scriptContext.type == "edit") {
                var soId = newRec.getValue({fieldId:"custbody_swc_so_num"});
                var newCount = newRec.getLineCount({sublistId:"item"});
                var oldCount = oldRec.getLineCount({sublistId:"item"});
                var needRewriteJson = {}; // solineid：差值
                var newJson = {};
                var oldJson = {};
                if(soId) {
                    // 保存后的数据
                    for(var i = 0; i < newCount; i++) {
                        var soLineId = newRec.getSublistValue({sublistId:"item",fieldId:"custcol_swc_so_lineid",line:i});
                        var cha = newRec.getSublistValue({sublistId:"item",fieldId:"custcol_swc_differencevalue",line:i});
                        var qty = newRec.getSublistValue({sublistId:"item",fieldId:"quantity",line:i});
                        newJson[soLineId] = qty;
                        if(cha) {
                            needRewriteJson[soLineId] = cha;
                        }
                    }
                    // 保存前的数据
                    for(var i = 0; i < oldCount; i++) {
                        var soLineId = oldRec.getSublistValue({sublistId:"item",fieldId:"custcol_swc_so_lineid",line:i});
                        var cha = oldRec.getSublistValue({sublistId:"item",fieldId:"custcol_swc_differencevalue",line:i});
                        var qty = oldRec.getSublistValue({sublistId:"item",fieldId:"quantity",line:i});
                        oldJson[soLineId] = qty;
                    }

                    // 加上删除行的数量回写
                    for(var solineid in oldJson) {
                        if(!newJson.hasOwnProperty(solineid)) {
                            needRewriteJson[solineid] = -oldJson[solineid];
                        }
                    }

                    // 回写本次solineid创建po的数量
                    var soRec = record.load({type:"salesorder",id:soId,isDynamic:true});
                    var count = soRec.getLineCount({sublistId:'item'});
                    for(var m = 0; m < count; m++) {
                        soRec.selectLine({sublistId:"item",line:m});
                        var soLineId = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"line"});
                        if(needRewriteJson.hasOwnProperty(soLineId)) {
                            var poQty = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity"}) || 0;
                            var newQty = Number(poQty) + Number(needRewriteJson[soLineId]);
                            soRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity",value:newQty < 0 ? 0 : newQty});
                            soRec.commitLine({sublistId:'item'});
                        }
                    }
                    soRec.save({enableSourcing:true,ignoreMandatoryFields:true});

                    // 清空差值字段
                    var secrec = record.load({type: "purchaseorder", id: newRec.id, isDynamic: true});
                    for (var j = 0; j < newCount; j++) {
                        secrec.selectLine({sublistId: "item", line: j});
                        secrec.setCurrentSublistValue({sublistId: "item", fieldId: "custcol_swc_differencevalue", value: ""});
                        secrec.commitLine({sublistId: "item"});
                    }
                    secrec.save();
                }
            }

            // 20240403 zcg 关闭SALES ORDER NUMBER有值的PO回写so数据
            if(scriptContext.type == "delete") {

                var soLineIdQtyJson = {};
                var soId = oldRec.getValue({fieldId:"custbody_swc_so_num"});
                if(soId) {
                    // log.debug("删除触发回写so",soId)
                    var count = newRec.getLineCount({sublistId: "item"});
                    for(var i = 0; i < count; i++) {
                        var qty = newRec.getSublistValue({sublistId: "item", fieldId: "quantity", line: i}); // 数量
                        var soLineId = newRec.getSublistValue({sublistId: "item", fieldId: "custcol_swc_so_lineid", line: i}); // so行ID
                        soLineIdQtyJson[soLineId] = qty;
                    }
                    // log.debug("soLineIdQtyJson",JSON.stringify(soLineIdQtyJson))
                    // 回写本次solineid创建po的数量
                    var soRec = record.load({type:"salesorder",id:soId,isDynamic:true});
                    var count = soRec.getLineCount({sublistId:'item'});
                    for(var m = 0; m < count; m++) {
                        soRec.selectLine({sublistId:"item",line:m});
                        var soLineId = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"line"});
                        if(soLineIdQtyJson.hasOwnProperty(soLineId)) {
                            var poQty = soRec.getCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity"}) || 0;
                            var newQty = Number(poQty) - Number(soLineIdQtyJson[soLineId]);
                            soRec.setCurrentSublistValue({sublistId:"item",fieldId:"custcol_swc_poquantity",value:newQty < 0 ? 0 : newQty});
                            soRec.commitLine({sublistId:'item'});
                        }
                    }
                    soRec.save({enableSourcing:true,ignoreMandatoryFields:true});

                }
            }
        }


        return {beforeLoad, beforeSubmit, afterSubmit}

    });