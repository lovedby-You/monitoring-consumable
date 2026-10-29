const { createStockService } = require('./stock.service');
const { createStockRouter } = require('./stock.router');
const { stockInSchema, stockOutSchema } = require('./stock.schema');

module.exports = {
  stockInRouter: createStockRouter(createStockService('IN'), stockInSchema),
  stockOutRouter: createStockRouter(createStockService('OUT'), stockOutSchema),
};
