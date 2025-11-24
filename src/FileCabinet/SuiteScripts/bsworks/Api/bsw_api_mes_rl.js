/**
 * NetSuite&MES数据交换 API脚本
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define([
    "N/record",
    "../plugin/bsworks/bsworksUtil-1.0.min",
    "./Util/restletUtil",
    "./Mes/bsw_mes_getdata_base",
    "./Mes/bsw_mes_putdata_order",
    "./Mes/bsw_mes_putdata_inventory",
    "./Mes/bsw_mes_putdata_manufacturing",
    "N/encode"
], (record, bsworks, restletUtil, basedata, orderdata, inventorydata, manufacturingdata, encode) => {

    const doPost = (requestBody) => {
        if (null == requestBody || "" == requestBody) {
            return bsworks.https.getFailResponse("请求参数不能为空！");
        }

        if (!(requestBody instanceof Object)) {
            requestBody = JSON.parse(encode.convert({
                string: requestBody,
                inputEncoding: encode.Encoding.BASE_64,
                outputEncoding: encode.Encoding.UTF_8
            }));
            log.debug("requestBody-base", requestBody);
        } else {
            log.debug("requestBody", requestBody);
        }


        const recordType = requestBody.recordType;
        if (bsworks.isNullOrEmpty(recordType)) {
            return bsworks.https.getFailResponse("请求参数recordType不能为空！");
        }
        requestBody = restletUtil.HandleRequestBody(requestBody);

        let resultDataList = [];
        //基础数据
        if (recordType == "get_inventoryitem") {
            //库存货品
            requestBody.type = "InvtPart";
            resultDataList = basedata.getBaseItem(requestBody);
        } else if (recordType == "get_noninventoryitem") {
            //非库存货品-采购用
            requestBody.type = "NonInvtPart";
            resultDataList = basedata.getBaseItem(requestBody);
        } else if (recordType == "get_assemblyitem") {
            //装配件货品
            requestBody.type = "Assembly";
            resultDataList = basedata.getBaseItem(requestBody);
        } else if (recordType == "get_itembom") {
            //物料清单
            resultDataList = basedata.getBaseItemBom(requestBody);
        } else if (recordType == "get_customer") {
            //客户
            resultDataList = basedata.getCustomerList(requestBody);
        } else if (recordType == "get_supplier") {
            //供应商
            resultDataList = basedata.getSupplierList(requestBody);
        } else if (recordType == "get_location") {
            //仓库
            resultDataList = basedata.getBaseLocation(requestBody);
        } else if (recordType == "get_bin") {
            //库位
            resultDataList = basedata.getBaseBin(requestBody);
        } else if (recordType == "get_account") {
            //科目
            resultDataList = basedata.getAccountList(requestBody);
        } else if (recordType == "get_custlist") {
            //自定义列表数据
            if (bsworks.isNullOrEmpty(requestBody.listType)) {
                return bsworks.https.getFailResponse("请求参数listType不能为空！");
            }
            resultDataList = basedata.getCustlistList(requestBody);
        } else if (recordType == "put_itemreceipt") {
            //推送入库单
            return orderdata.putItemreceipt(requestBody);
        } else if (recordType == "put_itemfulfillment") {
            //推送出库单
            return orderdata.putItemfulfillment(requestBody);
        } else if (recordType == "get_inventoryadjusttype") {
            //获取调整类型数据
            return inventorydata.getInventoryadjusttype(requestBody);
        } else if (recordType == "put_inventoryadjustment") {
            //推送库存调整单数据
            return inventorydata.putInventoryadjustment(requestBody);
        } else if (recordType == "put_inventorytransfer") {
            //推送库存转移单数据
            return inventorydata.putInventorytransfer(requestBody);
        } else if (recordType == "put_assemblybuild") {
            //推送装配件构建数据
            return manufacturingdata.putAssemblybuild(requestBody);
        } else if (recordType == "put_record_status") {
            //更新同步状态
            const internalids = requestBody.internalids;
            if (bsworks.isNullOrEmpty(internalids)) {
                return bsworks.http.getFailResponse("参数internalids不能为空！");
            }
            const putRecordType = requestBody.putRecordType;
            if (bsworks.isNullOrEmpty(putRecordType)) {
                return bsworks.http.getFailResponse("参数putRecordType不能为空！");
            }
            return updateLocalSyncStatus(requestBody);
        }
        log.debug("resultDataList", resultDataList.length);
        return bsworks.https.getSuccessResponse(null, resultDataList);

    }

    /**
     * 更新同步状态
     * @param {*} requestBody 
     */
    const updateLocalSyncStatus = (requestBody) => {
        try {
            const recordType = requestBody.putRecordType;
            if (!restletUtil.constant.syncRrecordTypetatus.includes(recordType)) {
                return bsworks.https.getSuccessResponse();
            }
            const internalids = requestBody.internalids;
            const internalidList = internalids.split(",");
            //最多50条记录
            let lines = internalidList.length;
            if (lines > 20) {
                lines = 20;
            }
            for (let i = 0; i < lines; i++) {
                //根据记录类型获取表名
                let type = restletUtil.constant.recordTypeMapping[recordType];
                let id = internalidList[i];
                const recordObj = record.load({ type: type, id: id });
                if (recordType == "get_inventoryitem" || recordType == "get_assemblyitem") {
                    recordObj.setValue({ fieldId: "custitem_bsw_local_sync_status", value: true });
                } else if (recordType == "get_itembom") {
                    recordObj.setValue({ fieldId: "custrecord_bsw_local_sync_status", value: true });
                } else if (recordType == "get_customer" || recordType == "get_supplier") {
                    recordObj.setValue({ fieldId: "custentity_bsw_local_sync_status", value: true });
                } else if (recordType == "get_location") {
                    recordObj.setValue({ fieldId: "custrecord_bsw_location_sync_status", value: true });
                } else if (recordType == "get_bin") {
                    recordObj.setValue({ fieldId: "custrecord_bsw_bin_local_sync_status", value: true });
                } else if (recordType == "get_account") {
                    recordObj.setValue({ fieldId: "custrecord_bsw_account_local_sync_status", value: true });
                }
                recordObj.setValue({ fieldId: "bsworks_api_sync_status", value: true });
                recordObj.save({ ignoreMandatoryFields: true });
            }
            return bsworks.https.getSuccessResponse();
        } catch (e) {
            log.error("updateLocalSyncStatus", e);
            return bsworks.https.getFailResponse(e.message);
        }
    }

    return {
        post: doPost
    }
});