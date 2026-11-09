import { Router } from 'express'
import { authRouter } from './auth.routes.js'
import { productsRouter } from './products.routes.js'
import { categoriesRouter } from './categories.routes.js'
import { cartRouter } from './cart.routes.js'
import { wishlistRouter } from './wishlist.routes.js'
import { ordersRouter } from './orders.routes.js'
import { paymentsRouter } from './payments.routes.js'
import { adminRouter } from './admin.routes.js'
import { accountRouter } from './account.routes.js'
import { uploadsRouter } from './uploads.routes.js'

export const apiRouter = Router()
apiRouter.get('/', (_req, res) => res.json({ name: "Khyleene's Collection API", version: 'v1' }))
apiRouter.use('/auth', authRouter)
apiRouter.use('/products', productsRouter)
apiRouter.use('/categories', categoriesRouter)
apiRouter.use('/cart', cartRouter)
apiRouter.use('/wishlist', wishlistRouter)
apiRouter.use('/orders', ordersRouter)
apiRouter.use('/payments', paymentsRouter)
apiRouter.use('/admin', adminRouter)
apiRouter.use('/account', accountRouter)
apiRouter.use('/uploads', uploadsRouter)