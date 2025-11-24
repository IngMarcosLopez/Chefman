/**
 * 推送数据到NetSuite-制造工单相关数据
 */
define(["../../plugin/bsworks/bsworksUtil-1.0.min", "./bsw_mes_putdata_util", "N/record"], (bsworks, putdataUtil, record) => {

    /**
    * 推送装配件构建数据
    * @param {*} requestBody 
    */
    const putAssemblybuild = (requestBody) => {
        // log.debug("requestBody", requestBody);

        try {
            const maindata = requestBody.maindata;
            if (null == maindata || Object.keys(maindata).length == 0) {
                return bsworks.https.getFailResponse("主数据不能为空");
            }
            if (bsworks.isNullOrEmpty(maindata.createdfrom)) {
                return bsworks.https.getFailResponse("工单ID不能为空！");
            }
            if ((parseFloat(maindata.quantity) || 0) == 0) {
                return bsworks.https.getFailResponse("要构建的数量不能为空或零！");
            }

            let inventorydetail = maindata.inventorydetail;
            // if (null == inventorydetail || inventorydetail.length == 0) {
            //     return bsworks.https.getFailResponse("主信息库存详情不能为空！");
            // }

            // const errorMessages = [];
            // inventorydetail.forEach((item, index) => {
            //     const firstMsg = "主信息库存详情第" + (index + 1) + "条记录";
            //     const itemErrors = [];
            //     if ((parseFloat(item.quantity) || 0) == 0) {
            //         itemErrors.push("数量");
            //     }
            //     if (itemErrors.length > 0) {
            //         errorMessages.push(firstMsg + itemErrors.join(",") + "不能为空！");
            //     }
            // })
            // if (errorMessages.length > 0) {
            //     return bsworks.https.getFailResponse(errorMessages.join(","));
            // }

            const itemlist = requestBody.itemlist;
            // if (null == itemlist || itemlist.length == 0) {
            //     return bsworks.https.getFailResponse("货品明细数据不能为空");
            // }
            // itemlist.forEach((item, index) => {
            //     const firstMsg = "货品明细第" + (index + 1) + "条记录";
            //     const itemErrors = [];
            //     if (bsworks.isNullOrEmpty(item.item)) {
            //         itemErrors.push("货品ID");
            //     }
            //     if ((parseFloat(item.quantity) || 0) == 0) {
            //         itemErrors.push("数量");
            //     }
            //     if (bsworks.isNullOrEmpty(item.line)) {
            //         itemErrors.push("行号");
            //     }

            //     const itemInventorydetail = item.inventorydetail;
            //     if (null == itemInventorydetail || itemInventorydetail == 0) {
            //         itemErrors.push("库存详情不能为空！");
            //     } else {
            //         itemInventorydetail.forEach((inventory, idx) => {
            //             const inventoryfirstMsg = "库存详情第" + (idx + 1) + "条记录";
            //             const inventoryitemErrors = [];
            //             if ((parseFloat(inventory.quantity) || 0) == 0) {
            //                 inventoryitemErrors.push("数量");
            //             }
            //             if (inventoryitemErrors.length > 0) {
            //                 errorMessages.push(firstMsg + inventoryfirstMsg + inventoryitemErrors.join(",") + "不能为空！");
            //             }
            //         })
            //     }
            //     if (itemErrors.length > 0) {
            //         errorMessages.push(firstMsg + itemErrors.join(",") + "不能为空！");
            //     }
            // })
            // if (errorMessages.length > 0) {
            //     return bsworks.https.getFailResponse(errorMessages.join(","));
            // }

            const recordObj = record.transform({
                fromType: "workorder",
                fromId: maindata.createdfrom,
                toType: "assemblybuild",
                isDynamic: true
            });
            if (!bsworks.isNullOrEmpty(maindata.tranid)) {
                recordObj.setValue({ fieldId: "tranid", value: maindata.tranid });
            }
            if (!bsworks.isNullOrEmpty(maindata.trandate)) {
                recordObj.setValue({ fieldId: "trandate", value: bsworks.date.stringToDate(maindata.trandate) });
            }
            if (!bsworks.isNullOrEmpty(maindata.location) && recordObj.getValue("location") != maindata.location) {
                recordObj.setValue({ fieldId: "location", value: maindata.location });
            }

            const quantity = recordObj.getValue("quantity") || 0;
            if (parseFloat(quantity) < parseFloat(maindata.quantity)) {
                return bsworks.https.getFailResponse("构建的数量不能大于待构建数量" + quantity + "！");
            }

            recordObj.setValue({ fieldId: "quantity", value: maindata.quantity });
            if (!bsworks.isNullOrEmpty(maindata.memo)) {
                recordObj.setValue({ fieldId: "memo", value: maindata.memo });
            }
            const location = recordObj.getValue("location");
            const locations = [location]; //获取仓库对应的所有库位
            const locaitonBins = putdataUtil.getLocationBins(bsworks, locations);
            const binnumber = locaitonBins[location];

            if (null == inventorydetail || inventorydetail.length == 0) {
                if (null == inventorydetail) inventorydetail = [];
                inventorydetail.push({
                    binnumber: binnumber,
                    receiptinventorynumber: binnumber,
                    quantity: maindata.quantity
                });
            } else {
                inventorydetail = inventorydetail.map(invdata => {
                    invdata.binnumber = binnumber;
                    invdata.receiptinventorynumber = binnumber;
                    return invdata;
                })
            }

            //工单记录对象
            const workorderRecord = record.load({ type: "workorder", id: maindata.createdfrom });
            if (null == itemlist || itemlist.length == 0) {
                if (null == itemlist) itemlist = [];
                //工单数量
                const woQuantity = workorderRecord.getValue("quantity");
                const wolineCount = workorderRecord.getLineCount({ sublistId: "item" });
                for (let wline = 0; wline < wolineCount; wline++) {
                    const item = workorderRecord.getSublistValue({ sublistId: "item", fieldId: "item", line: wline });
                    const bomquantity = workorderRecord.getSublistValue({ sublistId: "item", fieldId: "bomquantity", line: wline });
                    //计算装配件组件数量=（工单货品数量/工单数量）*装配件数量
                    let componentQuantity = (parseFloat(bomquantity) / parseFloat(woQuantity)) * parseFloat(maindata.quantity);
                    componentQuantity = parseFloat(componentQuantity).toFixed(8);
                    componentQuantity = handleData(componentQuantity);
                    const line = workorderRecord.getSublistValue({ sublistId: "item", fieldId: "line", line: wline });

                    const iteminventorydetail = {
                        binnumber: binnumber,
                        issueinventorynumber: binnumber,
                        quantity: componentQuantity
                    }
                    itemlist.push({
                        item: item,
                        quantity: componentQuantity,
                        line: line,
                        inventorydetail: [iteminventorydetail]
                    })
                }
            }
            try {
                const inventoryRecord = recordObj.getSubrecord({ fieldId: "inventorydetail" });
                inventorydetail.forEach(inventoryd => {
                    inventoryRecord.selectNewLine({ sublistId: "inventoryassignment" });
                    if (!bsworks.isNullOrEmpty(inventoryd.binnumber)) {
                        inventoryRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "binnumber", value: inventoryd.binnumber });
                    }
                    if (!bsworks.isNullOrEmpty(inventoryd.receiptinventorynumber)) {
                        inventoryRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "receiptinventorynumber", value: inventoryd.receiptinventorynumber });
                    }
                    let inventoryStatus = "1";
                    if (!bsworks.isNullOrEmpty(inventoryd.status)) {
                        inventoryStatus = inventoryd.status;
                    }
                    inventoryRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "status", value: inventoryStatus });
                    inventoryRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "quantity", value: inventoryd.quantity });
                    inventoryRecord.commitLine({ sublistId: 'inventoryassignment' });
                })
            } catch (e) {
                log.error("装配件构建表头库存详情", e);
            }

            const lineCount = recordObj.getLineCount({ sublistId: "component" });
            for (let line = 0; line < lineCount; line++) {
                recordObj.selectLine({ sublistId: "component", line: line });
                const item = recordObj.getCurrentSublistValue({ sublistId: "component", fieldId: "item" });
                const componentItem = itemlist.find(citem => citem.item == item);
                recordObj.setCurrentSublistValue({ sublistId: "component", fieldId: "quantity", value: componentItem.quantity });

                try {
                    const inventorydetailRecord = recordObj.getCurrentSublistSubrecord({ sublistId: "component", fieldId: "componentinventorydetail" });
                    const inventoryLines = inventorydetailRecord.getLineCount({ sublistId: "inventoryassignment" });

                    // log.debug("inventoryLines",inventoryLines);
                    if (inventoryLines > 0) {
                        for (let invline = inventoryLines - 1; invline >= 0; invline--) {
                            inventorydetailRecord.removeLine({ sublistId: "inventoryassignment", line: invline });
                        }
                    }
                    log.debug("componentItem", componentItem);
                    for (let i = 0; i < componentItem.inventorydetail.length; i++) {
                        const inventoryData = componentItem.inventorydetail[i];
                        // log.debug("inventoryData",inventoryData);
                        inventorydetailRecord.selectNewLine({ sublistId: "inventoryassignment" });
                        if (!bsworks.isNullOrEmpty(inventoryData.binnumber)) {
                            inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "binnumber", value: inventoryData.binnumber });
                        }
                        if (!bsworks.isNullOrEmpty(inventoryData.issueinventorynumber)) {
                            inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "issueinventorynumber", value: inventoryData.issueinventorynumber });
                        }
                        inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "status", value: "1" });
                        inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "quantity", value: inventoryData.quantity });
                        inventorydetailRecord.commitLine({ sublistId: 'inventoryassignment' });
                    }
                } catch (e) {
                    log.error("装配件构建表体库存详情", e);
                }

                recordObj.commitLine({ sublistId: "component" });
            }

            const internalid = recordObj.save({ ignoreMandatoryFields: true });
            log.debug("putAssemblybuild-internalid", internalid);
            /** 
            //创建领料
            try {
                const requestData = {
                    subsidiary: workorderRecord.getValue("subsidiary"),
                    location: 32,
                    transferlocation: maindata.location,
                    internalid: maindata.createdfrom,
                    //装配件
                    custbody_chefman_assembly: workorderRecord.getValue("assemblyitem"),
                    //物料清单
                    custbody_chefman_bom: workorderRecord.getValue("billofmaterials"),
                    //物料清单版本
                    custbody_chefman_bom_rev: workorderRecord.getValue("billofmaterialsrevision"),
                    //领料套数
                    picking_todo: maindata.quantity,
                    //备注
                    memo: recordObj.getValue("outsourced") ? "外协备料" : "车间备料",
                }
                const subdataList = [];

                const wlineCount = workorderRecord.getLineCount({ sublistId: "item" });
                for (let wline = 0; wline < wlineCount; wline++) {
                    const item = workorderRecord.getSublistValue({ sublistId: "item", fieldId: "item", line: wline });
                    const buildItem = itemlist.find(citem => citem.item == item);
                    if (buildItem) {
                        subdataList.push({
                            item: item,
                            units: workorderRecord.getSublistValue({ sublistId: "item", fieldId: "units", line: wline }),
                            quantity: buildItem.quantity,
                            custcol_workshop_stock_qty: workorderRecord.getSublistValue({ sublistId: "item", fieldId: "custcol_workshop_stock_qty", line: wline }) || 0,
                            line: workorderRecord.getSublistValue({ sublistId: "item", fieldId: "line", line: wline }),
                        })
                    }
                }
                requestData.subdataList = subdataList;
                const responseObject = doCreateInventoryTransfer(requestData);
                log.debug("创建领料", responseObject);
            } catch (e) {
                log.error("创建领料", e);
            }
            //创建完工入库
            try {
                const buildRecord = record.load({ type: "assemblybuild", id: internalid });
                let buttonId = "";
                //货品分类
                const itemCategory = buildRecord.getValue("custbody_item_catogory");
                if (null != itemCategory && itemCategory == "1") {
                    buttonId = "custpage_assemblybuild_initem";
                } else {
                    //外包费用
                    const outsourcingcharge = recordObj.getValue("outsourcingcharge");
                    //链接库存转移
                    const linkedinventorytransfer = recordObj.getValue("linkedinventorytransfer");
                    if (bsworks.isNullOrEmpty(linkedinventorytransfer) && !bsworks.isNullOrEmpty(outsourcingcharge)) {
                        buttonId = "custpage_assemblybuild_outitem";
                    }
                }
                if (!bsworks.isNullOrEmpty(buttonId)) {
                    const requestData = {
                        recordId: internalid,
                        buttonId: buttonId
                    }
                    const responseObject = doCreateInventoryTransfer2(buildRecord, requestData);
                    log.debug("创建完工入库", responseObject);
                }

            } catch (e) {
                log.error("创建完工入库", e);
            }
            */
            return bsworks.https.getSuccessResponse(null, { internalid: internalid });

        } catch (e) {
            log.error("putAssemblybuild throws exception", e);
            return bsworks.https.getFailResponse(e.message);
        }
    }

    /**
    * 创建库存转移单-备货
    * @param {*} data 
    */
    const doCreateInventoryTransfer = (data) => {
        const recordObj = record.create({ type: 'inventorytransfer', isDynamic: true, });
        recordObj.setValue({ fieldId: 'subsidiary', value: data.subsidiary });
        recordObj.setValue({ fieldId: 'location', value: data.location });
        recordObj.setValue({ fieldId: 'transferlocation', value: data.transferlocation });

        recordObj.setValue({ fieldId: "custbody_chefman_wo_no", value: data.internalid });
        recordObj.setValue({ fieldId: "custbody_chefman_assembly", value: data.custbody_chefman_assembly });
        recordObj.setValue({ fieldId: "custbody_chefman_bom", value: data.custbody_chefman_bom });
        recordObj.setValue({ fieldId: "custbody_chefman_bom_rev", value: data.custbody_chefman_bom_rev });
        recordObj.setValue({ fieldId: "custbody_csm_picking_set", value: data.picking_todo });
        recordObj.setValue({ fieldId: 'memo', value: data.memo });

        const workorderItemList = []; //需要反填已工单货品已领料数量字段值的记录
        data.subdataList.forEach(subdata => {
            recordObj.selectNewLine({ sublistId: "inventory" });
            recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'item', value: subdata.item });
            recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'units', value: subdata.units });
            recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'adjustqtyby', value: subdata.quantity });
            const sourcedocFlag = "workorder#" + data.internalid + "#" + (parseFloat(data.picking_todo) || 0) + "#" + subdata.line;
            recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "custcol_chefman_sourcedoc_flag", value: sourcedocFlag });

            //库存详情
            const inventoryDetail = recordObj.getCurrentSublistSubrecord({ sublistId: "inventory", fieldId: "inventorydetail" });
            inventoryDetail.selectNewLine({ sublistId: "inventoryassignment" });
            inventoryDetail.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "binnumber",
                value: "1",
            });
            inventoryDetail.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "quantity",
                value: subdata.quantity,
            });
            inventoryDetail.commitLine({ sublistId: 'inventoryassignment' });
            recordObj.commitLine({ sublistId: "inventory" });

            //已领料数量
            const custcol_workshop_stock_qty = parseFloat(subdata.quantity) + (parseFloat(subdata.custcol_workshop_stock_qty) || 0);
            workorderItemList.push({ line: subdata.line, custcol_workshop_stock_qty: custcol_workshop_stock_qty });
        })
        const internalid = recordObj.save();

        //处理需要反填工单数量字段值的记录
        const workorderRecord = record.load({ type: "workorder", id: data.internalid, });
        if ((parseFloat(data.custbody_csm_picking_set) || 0) > 0) {
            workorderRecord.setValue({ fieldId: 'custbody_csm_picking_set', value: data.custbody_csm_picking_set });
        }
        const lineCount = workorderRecord.getLineCount({ sublistId: "item" });
        for (let i = 0; i < lineCount; i++) {
            const line = workorderRecord.getSublistValue({ sublistId: "item", fieldId: "line", line: i });
            for (let p = 0; p < workorderItemList.length; p++) {
                const workorderItem = workorderItemList[p];
                if (line == workorderItem.line) {
                    workorderRecord.setSublistValue({
                        sublistId: "item",
                        fieldId: "custcol_workshop_stock_qty",
                        value: workorderItem.custcol_workshop_stock_qty,
                        line: i
                    });
                    break;
                }
            }
        }
        workorderRecord.save();


        return bsworks.https.getSuccessResponse(null, { internalid: internalid });
    }

    /**
    * 创建库存转移单-完工入库
    * @param {*} data 
    */
    const doCreateInventoryTransfer2 = (assemblyRecord, data) => {
        //计算待转移库存数量
        const quantity = assemblyRecord.getValue("quantity");
        const pickingset = assemblyRecord.getValue("custbody_csm_picking_set");
        const adjustqtyby = (parseFloat(quantity) || 0) - (parseFloat(pickingset) || 0);
        if (parseFloat(adjustqtyby) <= 0) {
            return bsworks.https.getFailResponse("构建数量不能小于已转移库存数量");
        }
        const recordObj = record.create({ type: 'inventorytransfer', isDynamic: true, });
        const subsidiary = assemblyRecord.getValue("subsidiary");
        recordObj.setValue({ fieldId: 'subsidiary', value: subsidiary });
        recordObj.setValue({ fieldId: 'location', value: assemblyRecord.getValue("location") });
        //公司ID=25时，外协转库：默认为车间仓（ID=68) 完工转库：默认为成品仓（ID=40)
        //const transferlocation = (data.buttonId == "custpage_assemblybuild_outitem" ? "68" : "40");
        //20240416 外协转库和完工转库的至地点都改成ID=32 厨曼杭州 (Chuman Hangzhou) 
        const transferlocation = "32";
        recordObj.setValue({ fieldId: 'transferlocation', value: transferlocation });

        recordObj.setValue({ fieldId: "custbody_chefman_built_no", value: assemblyRecord.id });
        recordObj.setValue({ fieldId: "custbody_chefman_assembly", value: assemblyRecord.getValue("item") });
        recordObj.setValue({ fieldId: "custbody_chefman_bom", value: assemblyRecord.getValue("billofmaterials") });
        recordObj.setValue({ fieldId: "custbody_chefman_bom_rev", value: assemblyRecord.getValue("billofmaterialsrevision") });
        recordObj.setValue({ fieldId: "custbody_csm_picking_set", value: adjustqtyby });
        recordObj.setValue({ fieldId: 'memo', value: data.buttonId == "custpage_assemblybuild_outitem" ? "外协转库" : "完工转库" });

        recordObj.selectNewLine({ sublistId: "inventory" });
        recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'item', value: assemblyRecord.getValue("item") });
        recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'units', value: assemblyRecord.getValue("units") });


        recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'adjustqtyby', value: adjustqtyby });
        const sourcedocFlag = "assemblybuild#" + data.recordId + "#" + adjustqtyby;
        recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "custcol_chefman_sourcedoc_flag", value: sourcedocFlag });
        //写入库存详情
        const inventorydetailRecord = recordObj.getCurrentSublistSubrecord({ sublistId: "inventory", fieldId: "inventorydetail" });
        inventorydetailRecord.selectNewLine({ sublistId: "inventoryassignment" });
        inventorydetailRecord.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "tobinnumber",
            value: "1"
        });
        inventorydetailRecord.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "quantity",
            value: adjustqtyby
        });
        inventorydetailRecord.commitLine({ sublistId: 'inventoryassignment' });

        recordObj.commitLine({ sublistId: "inventory" });

        const internalid = recordObj.save();

        //反填构建装配单已转移库存数量
        const custbody_csm_picking_set = (parseFloat(pickingset) || 0) + parseFloat(adjustqtyby);
        assemblyRecord.setValue({ fieldId: 'custbody_csm_picking_set', value: custbody_csm_picking_set });
        assemblyRecord.save();
        return bsworks.https.getSuccessResponse(null, { internalid: internalid });
    }

    /**
    * 数量保留10位
    * @param {*} data 
    */
    const handleData = (data, decimal) => {
        if (null == decimal) decimal = 10;
        decimal = parseInt(decimal);
        const dataStr = data + "";
        if (dataStr.indexOf(".") != -1) {
            decimal--;
        }
        const dataSplit = dataStr.split(".");
        if (dataSplit.length == 2) {
            if ((dataSplit[0].length + dataSplit[1].length) > decimal) {
                const newdata = dataSplit[0] + "." + dataSplit[1].substring(0, decimal - dataSplit[0].length);
                return parseFloat(newdata);
            }
        }
        return data;

    }


    return {
        putAssemblybuild,
    }
});