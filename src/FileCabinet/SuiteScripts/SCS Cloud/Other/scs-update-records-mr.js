/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/error'],
    (search, rec, error) => {

        /**
         *
         * @param getInputData
         * @returns {*[]}
         */
        const getInputData = () => {
            log.debug('begin running getInputData function');

            // Run an entire search
            return search.load({
                //id: 'customsearch_locations_to_update'
              id: 'customsearch_all_inventory_items'
            });
        }

        /**
         *
         * @param context
         */
        const map = context => {

            try {

                var result = JSON.parse(context.value);

                log.debug('begin running map function', result);

                const record = rec.load({
                    type: result.recordType,
                    id: result.id
                });
                //record.setValue({
                //    fieldId: 'externalid',
                //    value: null
                //});

                record.save({
                    ignoreMandatoryFields: true
                });

            } catch (error) {
                log.error('Error updating record', result);
                log.error('ERROR', error.toString());
            }
        }

        /**
         * This function logs all errors and the final results of the execution.
         *
         * @param {*} summary
         */
        const summarize = summary => {

            log.debug('summary', JSON.stringify(summary));

            if (summary.inputSummary.error) {
                log.error('input error', summary.inputSummary.error);

                summary.mapSummary.iterator().each(function(key, value) {
                    log.error(key, JSON.parse(value).message);

                    return true;
                });

                summary.reduceSummary.iterator().each(function(key, value) {
                    log.error(key, JSON.parse(value).message);

                    return true;
                });
            }

            log.audit('Usage Consumed', summary.usage);
            log.audit('Concurrency Number ', summary.concurrency);
            log.audit('Number of Yields', summary.yields);
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };
    });
