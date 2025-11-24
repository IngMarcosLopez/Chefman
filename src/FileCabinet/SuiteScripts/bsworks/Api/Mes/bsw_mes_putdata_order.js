/**
 * 推送数据到NetSuite-订单数据
 */
define(["../../plugin/bsworks/bsworksUtil-1.0.min", "./bsw_mes_putdata_util", "N/record"], (bsworks, putdataUtil, record) => {

    /**
    * 推送入库单数据
    * @param {*} requestBody 
    */
    const putItemreceipt = (requestBody) => {
        // log.debug("requestBody", requestBody);

        try {
            const maindata = requestBody.maindata;
            if (null == maindata || Object.keys(maindata).length == 0) {
                return bsworks.https.getFailResponse("主数据不能为空");
            }

            let fromType = "purchaseorder";
            if (!bsworks.isNullOrEmpty(requestBody.fromType)) {
                fromType = requestBody.fromType;
            }

            if (bsworks.isNullOrEmpty(maindata.orderid) && bsworks.isNullOrEmpty(maindata.createdfrom)) {
                if ("returnauthorization" == fromType) {
                    return bsworks.https.getFailResponse("退货授权ID不能为空！");
                }
                return bsworks.https.getFailResponse("采购订单ID不能为空！");
            }
            if (bsworks.isNullOrEmpty(maindata.custbody_hc_deliver_no)) {
                if ("purchaseorder" == fromType) {
                    return bsworks.https.getFailResponse("送货单号不能为空！");
                }
            }

            if (bsworks.isNullOrEmpty(maindata.tranid)) {
                return bsworks.https.getFailResponse("单据编号不能为空！");
            }
            const hasdataList = getTransDataList("itemreceipt", maindata.tranid);
            if (hasdataList.length > 0) {
                const internalid = hasdataList[0].internalid;
                return bsworks.https.getSuccessResponse(null, { internalid: internalid });
            }

            const itemlist = requestBody.itemlist;
            if (null == itemlist || itemlist.length == 0) {
                return bsworks.https.getFailResponse("货品明细数据不能为空");
            }

            const locations = []; //获取仓库对应的所有库位
            const errorMessages = [];
            itemlist.forEach((item, index) => {
                const firstMsg = "货品明细第" + (index + 1) + "条记录";
                const itemErrors = [];
                if (bsworks.isNullOrEmpty(item.item)) {
                    itemErrors.push("货品ID");
                }
                if (bsworks.isNullOrEmpty(item.location)) {
                    itemErrors.push("至地点ID");
                }
                if (bsworks.isNullOrEmpty(item.quantity)) {
                    itemErrors.push("数量");
                }
                if (bsworks.isNullOrEmpty(item.line)) {
                    itemErrors.push("行号");
                }
                if (itemErrors.length > 0) {
                    errorMessages.push(firstMsg + itemErrors.join(",") + "不能为空！");
                }
                if (locations.indexOf(item.location) == -1) {
                    locations.push(item.location);
                }
            })
            if (errorMessages.length > 0) {
                return bsworks.https.getFailResponse(errorMessages.join(","));
            }

            const locaitonBins = putdataUtil.getLocationBins(bsworks, locations);

            const createdfrom = maindata.createdfrom;
            if (bsworks.isNullOrEmpty(maindata.createdfrom)) {
                createdfrom = maindata.orderid;
            }

            const recordObj = record.transform({
                fromType: fromType,
                fromId: createdfrom,
                toType: "itemreceipt",
                isDynamic: true
            });
            if (!bsworks.isNullOrEmpty(maindata.tranid)) {
                recordObj.setValue({ fieldId: "tranid", value: maindata.tranid });
                recordObj.setValue({ fieldId: "custbody_chefman_mes_tranid", value: maindata.tranid });
            }
            if (!bsworks.isNullOrEmpty(maindata.trandate)) {
                recordObj.setValue({ fieldId: "trandate", value: bsworks.date.stringToDate(maindata.trandate) });
            }
            //送货单号
            if (!bsworks.isNullOrEmpty(maindata.custbody_hc_deliver_no)) {
                recordObj.setValue({ fieldId: "custbody_hc_deliver_no", value: maindata.custbody_hc_deliver_no });
            }

            if (!bsworks.isNullOrEmpty(maindata.memo)) {
                recordObj.setValue({ fieldId: "memo", value: maindata.memo });
            }
            //外协采购订单
            const wxpo = (null != requestBody.customform && requestBody.customform == "-9896");

            //外协采购订单获取工单组件
            let woItemDataList = [];
            let poItemDataList = [];
            if (wxpo) {
                //获取采购订单对应的工单组件
                const poRecord = record.load({ type: "purchaseorder", id: createdfrom });
                const polineCount = poRecord.getLineCount({ sublistId: "item" });
                const woids = [];
                for (let poline = 0; poline < polineCount; poline++) {
                    const woid = poRecord.getSublistValue({ sublistId: "item", fieldId: "createdoutsourcedwokey", line: poline });
                    woids.push(woid);

                    const item = poRecord.getSublistValue({ sublistId: "item", fieldId: "assembly", line: poline });
                    const line = poRecord.getSublistValue({ sublistId: "item", fieldId: "line", line: poline });
                    poItemDataList.push({
                        woid: woid, item: item, line: line
                    });
                }
                //获取工单组件
                woItemDataList = getWorkorderItemDataList(woids);
            }
            // log.debug("woItemDataList",woItemDataList);
            // log.debug("poItemDataList",poItemDataList);

            //验证货品行
            const validMessages = validSubItemList(recordObj, itemlist, wxpo);
            if (validMessages.length > 0) {
                return bsworks.https.getFailResponse(validMessages.join(","));
            }

            const lineCount = recordObj.getLineCount({ sublistId: "item" });
            for (let line = 0; line < lineCount; line++) {
                recordObj.selectLine({ sublistId: "item", line: line });
                let item = recordObj.getCurrentSublistValue({ sublistId: "item", fieldId: "item" });
                //外协采购订单
                if (wxpo) {
                    item = recordObj.getCurrentSublistValue({ sublistId: "item", fieldId: "assembly" });
                }
                const orderline = recordObj.getCurrentSublistValue({ sublistId: "item", fieldId: "orderline" });
                const receiptItem = itemlist.find(ritem => ritem.item == item && ritem.line == orderline);
                if (receiptItem) {
                    recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "itemreceive", value: true });
                    //非外协采购订单
                    if (!wxpo) {
                        recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "location", value: receiptItem.location });
                    }
                    recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "quantity", value: receiptItem.quantity });
                    if (!bsworks.isNullOrEmpty(receiptItem.custcol_pre_receive_date)) {
                        recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_pre_receive_date", value: bsworks.date.stringToDate(receiptItem.custcol_pre_receive_date) });
                    }
                    const binnumber = receiptItem.location ? locaitonBins[receiptItem.location] : null;

                    try {
                        if (wxpo) {
                            /** 仅库位或库存状态开启后使用此功能 */

                            //获取当前货品对应工单id
                            const poitemData = poItemDataList.find(poitem => poitem.item == item && poitem.line == orderline);
                            // log.debug("poitemData", {item, orderline, poitemData});

                            if (poitemData) {

                                const woid = poitemData.woid;

                                //获取当前货品对应的工单组件数据
                                const woItemList = woItemDataList.filter(woitem => woitem.internalid == woid);
                                log.debug("woItemList", { woid, woItemList });


                                if (woItemList.length > 0) {
                                    const assemblybuildinventorydata = {
                                        assembly: {
                                            quantity: receiptItem.quantity,
                                            inventoryAssignments: [
                                                {
                                                    binNumber: binnumber,
                                                    inventoryNumber: "",
                                                    quantity: receiptItem.quantity,
                                                    expirationDate: "",
                                                    //status: "1" 仅库存状态开启后使用
                                                }
                                            ]
                                        },
                                        components: {}
                                    }
                                    //可构建数量
                                    const total_quantity = woItemList[0].total_quantity;
                                    if (parseFloat(total_quantity || 0) > 0) {
                                        //当前构建数量占比
                                        const quantityRate = parseFloat(receiptItem.quantity) / parseFloat(total_quantity);
                                        woItemList.forEach(woitem => {
                                            const componentsQuantity = (parseFloat(woitem.quantityuom) * parseFloat(quantityRate)).toFixed(8);
                                            const components = {
                                                quantity: componentsQuantity,
                                                inventoryAssignments: []
                                                /** 仅库存状态开启后使用
                                                inventoryAssignments: [{
                                                    inventoryNumber: "",
                                                    quantity: componentsQuantity,
                                                    binNumber: woitem.binnumber,
                                                    expirationDate: "",
                                                    status: "1" 
                                                }] **/
                                            }
                                            assemblybuildinventorydata.components[woitem.line] = components;
                                        });
                                    }
                                    log.debug("assemblybuildinventorydata", assemblybuildinventorydata);
                                    recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "assemblybuildinventorydata", value: JSON.stringify(assemblybuildinventorydata) });
                                }

                            }
                            // const assemblybuildinventorydata = '{"assembly":{"quantity":"10","inventoryAssignments":[{"inventoryNumber":"","quantity":"10","binNumber":"","expirationDate":"","status":"1"}]},"components":{"1":{"quantity":"60","inventoryAssignments":[{"inventoryNumber":"","quantity":"60.0","binNumber":"","expirationDate":"","status":"1"}]},"2":{"quantity":"20","inventoryAssignments":[]},"3":{"quantity":"20","inventoryAssignments":[]}}}';
                        } else if (!wxpo && null != receiptItem.inventorydetail && receiptItem.inventorydetail.length > 0) {

                            const inventorydetailRecord = recordObj.getCurrentSublistSubrecord({ sublistId: "item", fieldId: "inventorydetail" });
                            const invLineCount = inventorydetailRecord.getLineCount({ sublistId: "inventoryassignment" });
                            if (invLineCount > 0) {
                                for (let invline = invLineCount - 1; invline >= 0; invline--) {
                                    inventorydetailRecord.removeLine({ sublistId: "inventoryassignment", line: invline });
                                }
                            }
                            for (let i = 0; i < receiptItem.inventorydetail.length; i++) {
                                const inventoryData = receiptItem.inventorydetail[i];
                                inventorydetailRecord.selectNewLine({ sublistId: "inventoryassignment" });
                                if (binnumber) {
                                    inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "binnumber", value: binnumber });
                                    inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "receiptinventorynumber", value: binnumber });
                                }
                                log.debug(receiptItem.quantity, inventoryData.quantity)
                                inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "quantity", value: inventoryData.quantity });
                            }
                            inventorydetailRecord.commitLine({ sublistId: 'inventoryassignment' });
                        }
                    } catch (e) {
                        log.error("putItemreceipt库存详细信息异常", e);
                    }

                } else {
                    recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "itemreceive", value: false });
                }
                recordObj.commitLine({ sublistId: "item" });
            }
            const internalid = recordObj.save({ ignoreMandatoryFields: true });
            log.debug("putItemreceipt-internalid", internalid);
            return bsworks.https.getSuccessResponse(null, { internalid: internalid });

        } catch (e) {
            log.debug("putItemreceipt throws exception", e);
            return bsworks.https.getFailResponse(e.message);
        }
    }

    /**
     * 验证行是否批次
     * @param {*} recordObj 
     * @param {*} receiptItemList 
     * @param {*} wxpo 
     * @returns 
     */
    const validSubItemList = (recordObj, receiptItemList, wxpo) => {
        const errorMessages = [];
        try {

            const itemKeys = [];
            const lineCount = recordObj.getLineCount({ sublistId: "item" });
            for (let line = 0; line < lineCount; line++) {
                let item = recordObj.getSublistValue({ sublistId: "item", fieldId: "item", line: line });
                //外协采购订单
                if (wxpo) {
                    item = recordObj.getSublistValue({ sublistId: "item", fieldId: "assembly", line: line });
                }
                const orderline = recordObj.getSublistValue({ sublistId: "item", fieldId: "orderline", line: line });
                itemKeys.push(item + "-" + orderline);
            }
            for (let line = 0; line < receiptItemList.length; line++) {
                const ritem = receiptItemList[line];
                const key = ritem.item + "-" + ritem.line;
                if (itemKeys.indexOf(key) == -1) {
                    errorMessages.push("货品" + key + "不存在");
                }
            }

        } catch (e) {
            log.error("valid subitem falil", e);
        }
        return errorMessages;
    }

    /**
     * 判断是否存在重复数据
     * @param {*} recordType 
     * @param {*} mesTranid 
     * @returns 
     */
    const getTransDataList = (recordType, mesTranid) => {
        const searchFields = [
            { id: "mainline", search: { type: 'none' }, filter: { values: "T" } },
            { id: "internalid" },
            { id: "custbody_chefman_mes_tranid", filter: { values: mesTranid } },
        ]
        const subdataList = bsworks.search.getSearchResultDataList(recordType, searchFields, 1, 10);
        return subdataList;
    }

    const getWorkorderItemDataList = (woids) => {
        let searchFields = [
            { id: "mainline", search: { type: 'none' }, filter: { values: "F" } },
            { id: "unit", label: "单位不等于无", search: { type: 'none' }, filter: { operator: "noneof", values: "@NONE@" } },
            { id: "itemsource", label: "货品来源等于库存", search: { type: 'none' }, filter: { values: "STOCK" } },
            { id: "quantityuom", label: "事务处理数量" },
            { id: "bomquantity", label: "bom数量" },
            { id: "item", label: "货品" },
            { id: "line", label: "行号" },
            { id: "quantity", alias: "total_quantity", label: "数量" },
            { id: "internalid", label: "内部ID", filter: { operator: "anyof", values: woids } }
        ];
        let subdataList = bsworks.search.getSearchAllResultDataList("workorder", searchFields, 1, 1000, null);

        searchFields = [
            { id: "mainline", search: { type: 'none' }, filter: { values: "T" } },
            { id: "quantity", alias: "total_quantity", label: "数量" },
            { id: "custrecord_csm_location_bin", alias: "binnumber", label: "仓库对应的库位", join: "location" },
            { id: "internalid", label: "内部ID", filter: { operator: "anyof", values: woids } }
        ];
        let dataList = bsworks.search.getSearchAllResultDataList("workorder", searchFields, 1, 1000, null);
        const dataObj = {};
        dataList.forEach(data => dataObj[data.internalid] = data.total_quantity);

        subdataList = subdataList.map(subdata => {
            const dataObj = dataList.find(data => data.internalid == subdata.internalid);
            if (dataObj) {
                subdata.total_quantity = dataObj.total_quantity;
                subdata.binnumber = dataObj.binnumber;
            }
            return subdata;
        })

        //计算转化率
        // dataList = dataList.map(data => {
        //     const conventrate = (parseFloat(data.quantityuom) / parseFloat(data.bomquantity)).toFixed(10);
        //     data.conventrate = conventrate;
        //     return data;
        // });
        return subdataList;
    }

    /**
    * 推送出库单数据
    * @param {*} requestBody 
    */
    const putItemfulfillment = (requestBody) => {
        // log.debug("requestBody", requestBody);

        try {
            const maindata = requestBody.maindata;
            if (null == maindata || Object.keys(maindata).length == 0) {
                return bsworks.https.getFailResponse("主数据不能为空");
            }

            let fromType = "salesorder";
            if (!bsworks.isNullOrEmpty(requestBody.fromType)) {
                fromType = requestBody.fromType;
            }
            if (bsworks.isNullOrEmpty(maindata.createdfrom)) {
                if ("vendorreturnauthorization" == fromType) {
                    return bsworks.https.getFailResponse("退货授权ID不能为空！");
                }
                return bsworks.https.getFailResponse("销售订单ID不能为空！");
            }

            if (bsworks.isNullOrEmpty(maindata.tranid)) {
                return bsworks.https.getFailResponse("单据编号不能为空！");
            }
            const hasdataList = getTransDataList("itemfulfillment", maindata.tranid);
            if (hasdataList.length > 0) {
                const internalid = hasdataList[0].internalid;
                return bsworks.https.getSuccessResponse(null, { internalid: internalid });
            }


            const itemlist = requestBody.itemlist;
            if (null == itemlist || itemlist.length == 0) {
                return bsworks.https.getFailResponse("货品明细数据不能为空");
            }

            const locations = []; //获取仓库对应的所有库位
            const errorMessages = [];
            itemlist.forEach((item, index) => {
                const firstMsg = "货品明细第" + (index + 1) + "条记录";
                const itemErrors = [];
                if (bsworks.isNullOrEmpty(item.item)) {
                    itemErrors.push("货品ID");
                }
                if (bsworks.isNullOrEmpty(item.location)) {
                    itemErrors.push("地点ID");
                }
                if (bsworks.isNullOrEmpty(item.quantity)) {
                    itemErrors.push("数量");
                }
                if (bsworks.isNullOrEmpty(item.line)) {
                    itemErrors.push("行号");
                }
                if (itemErrors.length > 0) {
                    errorMessages.push(firstMsg + itemErrors.join(",") + "不能为空！");
                }

                if (locations.indexOf(item.location) == -1) {
                    locations.push(item.location);
                }

            })
            if (errorMessages.length > 0) {
                return bsworks.https.getFailResponse(errorMessages.join(","));
            }

            const locaitonBins = putdataUtil.getLocationBins(bsworks, locations);

            const recordObj = record.transform({
                fromType: fromType,
                fromId: maindata.createdfrom,
                toType: "itemfulfillment",
                isDynamic: true
            });

            //出库单号
            if (!bsworks.isNullOrEmpty(maindata.tranid)) {
                recordObj.setValue({ fieldId: "tranid", value: maindata.tranid });
                recordObj.setValue({ fieldId: "custbody_chefman_mes_tranid", value: maindata.tranid });
            }
            if (!bsworks.isNullOrEmpty(maindata.trandate)) {
                recordObj.setValue({ fieldId: "trandate", value: bsworks.date.stringToDate(maindata.trandate) });
            }
            if (!bsworks.isNullOrEmpty(maindata.shipstatus)) {
                recordObj.setValue({ fieldId: "shipstatus", value: maindata.shipstatus });
            }
            if (!bsworks.isNullOrEmpty(maindata.shipaddress)) {
                recordObj.setValue({ fieldId: "shipaddress", value: maindata.shipaddress });
            }
            if (!bsworks.isNullOrEmpty(maindata.memo)) {
                recordObj.setValue({ fieldId: "memo", value: maindata.memo });
            }

            const lineCount = recordObj.getLineCount({ sublistId: "item" });
            for (let line = 0; line < lineCount; line++) {
                recordObj.selectLine({ sublistId: "item", line: line });
                const item = recordObj.getCurrentSublistValue({ sublistId: "item", fieldId: "item" });
                const orderline = recordObj.getCurrentSublistValue({ sublistId: "item", fieldId: "orderline" });
                const receiptItem = itemlist.find(ritem => ritem.item == item && ritem.line == orderline);
                if (receiptItem) {
                    recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "itemreceive", value: true });
                    recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "location", value: receiptItem.location });
                    recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "quantity", value: receiptItem.quantity });
                    if (!bsworks.isNullOrEmpty(receiptItem.custcol_hc_qty_per_box)) {
                        recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_hc_qty_per_box", value: receiptItem.custcol_hc_qty_per_box });
                    }
                    if (!bsworks.isNullOrEmpty(receiptItem.custcol_hc_box_qty)) {
                        recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "custcol_hc_box_qty", value: receiptItem.custcol_hc_box_qty });
                    }
                    const binnumber = receiptItem.location ? locaitonBins[receiptItem.location] : null;
                    try {
                        if (null != receiptItem.inventorydetail && receiptItem.inventorydetail.length > 0) {
                            const inventorydetailRecord = recordObj.getCurrentSublistSubrecord({ sublistId: "item", fieldId: "inventorydetail" });
                            const invLineCount = inventorydetailRecord.getLineCount({ sublistId: "inventoryassignment" });
                            if (invLineCount > 0) {
                                for (let invline = invLineCount - 1; invline >= 0; invline--) {
                                    inventorydetailRecord.removeLine({ sublistId: "inventoryassignment", line: invline });
                                }
                            }
                            for (let i = 0; i < receiptItem.inventorydetail.length; i++) {
                                const inventoryData = receiptItem.inventorydetail[i];
                                inventorydetailRecord.selectNewLine({ sublistId: "inventoryassignment" });
                                if (binnumber) {
                                    inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "binnumber", value: binnumber });
                                }
                                if (inventoryData.receiptinventorynumber) {
                                    inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "receiptinventorynumber", value: inventoryData.receiptinventorynumber });
                                }
                                // log.debug(receiptItem.quantity, inventoryData.quantity)
                                inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "quantity", value: inventoryData.quantity });
                            }
                            inventorydetailRecord.commitLine({ sublistId: 'inventoryassignment' });
                        }
                    } catch (e) {
                        log.error("putItemfulfillment", e);
                    }
                } else {
                    recordObj.setCurrentSublistValue({ sublistId: "item", fieldId: "itemreceive", value: false });
                }
                recordObj.commitLine({ sublistId: "item" });
            }
            const internalid = recordObj.save({ ignoreMandatoryFields: true });
            log.debug("putItemfulfillment-internalid", internalid);
            return bsworks.https.getSuccessResponse(null, { internalid: internalid });

        } catch (e) {
            log.debug("putItemfulfillment throws exception", e);
            return bsworks.https.getFailResponse(e.message);
        }
    }
    return {
        putItemreceipt,
        putItemfulfillment
    }
});