/**
 * 推送数据到NetSuite-库存数据
 */
define(["../../plugin/bsworks/bsworksUtil-1.0.min", "./bsw_mes_putdata_util", "N/record"], (bsworks, putdataUtil, record) => {


    /**
    * 推送库存调整单数据
    * @param {*} requestBody 
    */
    const putInventoryadjustment = (requestBody) => {
        // log.debug("requestBody", requestBody);
        try {
            const maindata = requestBody.maindata;
            if (null == maindata || Object.keys(maindata).length == 0) {
                return bsworks.https.getFailResponse("主数据不能为空");
            }
            if (bsworks.isNullOrEmpty(maindata.subsidiary)) {
                return bsworks.https.getFailResponse("子公司ID不能为空！");
            }
            if (bsworks.isNullOrEmpty(maindata.account)) {
                return bsworks.https.getFailResponse("调整科目不能为空！");
            }
            if (bsworks.isNullOrEmpty(maindata.custbody_ia_type)) {
                return bsworks.https.getFailResponse("调整类型不能为空！");
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
                if (bsworks.isNullOrEmpty(item.adjustqtyby)) {
                    itemErrors.push("数量调整");
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

            const recordObj = record.create({ type: "inventoryadjustment", isDynamic: true });
            if (!bsworks.isNullOrEmpty(maindata.tranid)) {
                recordObj.setValue({ fieldId: "tranid", value: maindata.tranid });
            }
            if (!bsworks.isNullOrEmpty(maindata.trandate)) {
                recordObj.setValue({ fieldId: "trandate", value: bsworks.date.stringToDate(maindata.trandate) });
            }
            recordObj.setValue({ fieldId: "subsidiary", value: maindata.subsidiary });
            recordObj.setValue({ fieldId: "account", value: maindata.account });
            recordObj.setValue({ fieldId: "custbody_ia_type", value: maindata.custbody_ia_type });
            if (!bsworks.isNullOrEmpty(maindata.memo)) {
                recordObj.setValue({ fieldId: "memo", value: maindata.memo });
            }

            const locaitonBins = putdataUtil.getLocationBins(bsworks, locations);
            itemlist.forEach(item => {
                recordObj.selectNewLine({ sublistId: "inventory" });
                recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "item", value: item.item });
                recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "location", value: item.location });
                const binnumber = locaitonBins[item.location];
                recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "custcol_chefman_location_bin", value: binnumber });
                recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "adjustqtyby", value: item.adjustqtyby });
                if (!bsworks.isNullOrEmpty(item.custcol_swc_adjust_quantity)) {
                    recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "custcol_swc_adjust_quantity", value: item.custcol_swc_adjust_quantity });
                }

                //添加库存
                if (null != item.inventorydetail && item.inventorydetail.length > 0) {
                    const inventorydetailRecord = recordObj.getCurrentSublistSubrecord({ sublistId: "inventory", fieldId: "inventorydetail" });
                    for (let i = 0; i < item.inventorydetail.length; i++) {
                        const inventoryData = item.inventorydetail[i];
                        inventorydetailRecord.selectNewLine({ sublistId: "inventoryassignment" });
                        if (!binnumber) {
                            inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "binnumber", value: binnumber });
                            inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "receiptinventorynumber", value: binnumber });
                        }
                        inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "quantity", value: inventoryData.quantity });
                    }
                    inventorydetailRecord.commitLine({ sublistId: 'inventoryassignment' });
                }
                recordObj.commitLine({ sublistId: "inventory" });
            })
            const internalid = recordObj.save({ ignoreMandatoryFields: true });
            log.debug("putInventoryadjustment-internalid", internalid);
            return bsworks.https.getSuccessResponse(null, { internalid: internalid });

        } catch (e) {
            log.debug("putInventoryadjustment throws exception", e);
            return bsworks.https.getFailResponse(e.message);
        }
    }

    /**
   * 推送库存转移单数据
   * @param {*} requestBody 
   */
    const putInventorytransfer = (requestBody) => {
        // log.debug("requestBody", requestBody);

        try {
            const maindata = requestBody.maindata;
            if (null == maindata || Object.keys(maindata).length == 0) {
                return bsworks.https.getFailResponse("主数据不能为空");
            }
            if (bsworks.isNullOrEmpty(maindata.subsidiary)) {
                return bsworks.https.getFailResponse("子公司ID不能为空！");
            }
            if (bsworks.isNullOrEmpty(maindata.location)) {
                return bsworks.https.getFailResponse("自地点ID不能为空！");
            }
            if (bsworks.isNullOrEmpty(maindata.transferlocation)) {
                return bsworks.https.getFailResponse("至地点ID不能为空！");
            }

            const itemlist = requestBody.itemlist;
            if (null == itemlist || itemlist.length == 0) {
                return bsworks.https.getFailResponse("货品明细数据不能为空");
            }
            const errorMessages = [];

            itemlist.forEach((item, index) => {
                const firstMsg = "货品明细第" + (index + 1) + "条记录";
                const itemErrors = [];
                if (bsworks.isNullOrEmpty(item.item)) {
                    itemErrors.push("货品ID");
                }
                if (bsworks.isNullOrEmpty(item.adjustqtyby)) {
                    itemErrors.push("待转移数量");
                }
                if (bsworks.isNullOrEmpty(item.line)) {
                    itemErrors.push("行号");
                }
                if (itemErrors.length > 0) {
                    errorMessages.push(firstMsg + itemErrors.join(",") + "不能为空！");
                }
            })
            if (errorMessages.length > 0) {
                return bsworks.https.getFailResponse(errorMessages.join(","));
            }


            const recordObj = record.create({ type: "inventorytransfer", isDynamic: true });
            if (!bsworks.isNullOrEmpty(maindata.tranid)) {
                recordObj.setValue({ fieldId: "tranid", value: maindata.tranid });
            }
            if (!bsworks.isNullOrEmpty(maindata.trandate)) {
                recordObj.setValue({ fieldId: "trandate", value: bsworks.date.stringToDate(maindata.trandate) });
            }
            recordObj.setValue({ fieldId: "subsidiary", value: maindata.subsidiary });
            recordObj.setValue({ fieldId: "location", value: maindata.location });
            recordObj.setValue({ fieldId: "transferlocation", value: maindata.transferlocation });

            if (!bsworks.isNullOrEmpty(maindata.custbody_chefman_wo_no)) {
                recordObj.setValue({ fieldId: "custbody_chefman_wo_no", value: maindata.custbody_chefman_wo_no });
            }
            if (!bsworks.isNullOrEmpty(maindata.custbody_chefman_assembly)) {
                recordObj.setValue({ fieldId: "custbody_chefman_assembly", value: maindata.custbody_chefman_assembly });
            }
            if (!bsworks.isNullOrEmpty(maindata.custbody_chefman_bom)) {
                recordObj.setValue({ fieldId: "custbody_chefman_bom", value: maindata.custbody_chefman_bom });
            }
            if (!bsworks.isNullOrEmpty(maindata.custbody_chefman_bom_rev)) {
                recordObj.setValue({ fieldId: "custbody_chefman_bom_rev", value: maindata.custbody_chefman_bom_rev });
            }
            if (!bsworks.isNullOrEmpty(maindata.custbody_csm_picking_set)) {
                recordObj.setValue({ fieldId: "custbody_csm_picking_set", value: maindata.custbody_csm_picking_set });
            }
            if (!bsworks.isNullOrEmpty(maindata.custbody_chefman_built_no)) {
                recordObj.setValue({ fieldId: "custbody_chefman_built_no", value: maindata.custbody_chefman_built_no });
            }
            if (!bsworks.isNullOrEmpty(maindata.memo)) {
                recordObj.setValue({ fieldId: "memo", value: maindata.memo });
            }

            //获取仓库对应的库位
            const locations = [maindata.location, maindata.transferlocation];
            const locaitonBins = putdataUtil.getLocationBins(bsworks, locations);
            const binnumber = locaitonBins[maindata.location];
            const tobinnumber = locaitonBins[maindata.transferlocation];

            itemlist.forEach(item => {
                recordObj.selectNewLine({ sublistId: "inventory" });
                recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "item", value: item.item });
                recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "adjustqtyby", value: item.adjustqtyby });

                log.debug("item.inventorydetail", item.inventorydetail);
                //添加库存
                if (null != item.inventorydetail && item.inventorydetail.length > 0) {
                    const inventorydetailRecord = recordObj.getCurrentSublistSubrecord({ sublistId: "inventory", fieldId: "inventorydetail" });
                    for (let i = 0; i < item.inventorydetail.length; i++) {
                        const inventoryData = item.inventorydetail[i];
                        log.debug("inventoryData", inventoryData);
                        inventorydetailRecord.selectNewLine({ sublistId: "inventoryassignment" });
                        if (binnumber) {
                            inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "binnumber", value: binnumber });
                        }
                        if (tobinnumber) {
                            inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "tobinnumber", value: tobinnumber });
                        }
                        const invquantity = handleData(inventoryData.quantity);
                        inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "quantity", value: invquantity });
                    }
                    inventorydetailRecord.commitLine({ sublistId: 'inventoryassignment' });
                }
                recordObj.commitLine({ sublistId: "inventory" });
            })
            const internalid = recordObj.save({ ignoreMandatoryFields: true });
            log.debug("putInventorytransfer-internalid", internalid);
            return bsworks.https.getSuccessResponse(null, { internalid: internalid });

        } catch (e) {
            log.debug("putInventorytransfer throws exception", e);
            return bsworks.https.getFailResponse(e.message);
        }
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
        putInventoryadjustment,
        putInventorytransfer
    }
});