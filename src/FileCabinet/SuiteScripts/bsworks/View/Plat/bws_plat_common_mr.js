/**
 * 平台中心通用 map/reduce脚本
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define(["./bws_plat_common", 'N/runtime'],
    (platCommon, runtime) => {
        const getInputData = (context) => {
            let reduceParams = runtime.getCurrentScript().getParameter({ name: "custscript_bws_plat_params" });
            reduceParams = JSON.parse(reduceParams);
            const subdataList = reduceParams.subdataList;
            return subdataList;
        }

        const map = (context) => {
            try {
                const data = JSON.parse(context.value);
                platCommon.doOperatorData(data, data.operator_type);

            } catch (e) {
                log.error("reduce-map", e);
            }
        }


        const reduce = (context) => {
            log.debug('reduce', JSON.stringify(context));
        }

        const summarize = (context) => {
            if (context.mapSummary.errors) {
                context.mapSummary.errors.iterator().each(function (key, value) {
                    log.error(key, value);
                    return true;
                });
            }
        }

        return { getInputData, map, summarize }
    })