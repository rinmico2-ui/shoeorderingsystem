import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { optionalAuth } from '../middlewares/auth.js'
import * as c from '../controllers/products.controller.js'
export const productsRouter = Router()
productsRouter.get('/', optionalAuth, asyncHandler(c.listProducts))
productsRouter.get('/:id', optionalAuth, asyncHandler(c.getProduct))