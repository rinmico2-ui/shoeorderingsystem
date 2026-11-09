import type { Request, Response } from 'express'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
export async function list(_req: Request, res: Response) { res.json({ data: await prisma.productCategory.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } }) }) }
export async function create(req: Request, res: Response) {
  const { name, slug, imageUrl, parentId, isActive } = req.body || {}
  if (!name) throw new AppError(400, 'name required', 'VALIDATION_ERROR')
  res.status(201).json({ data: await prisma.productCategory.create({ data: { name, slug: slugify(slug || name), imageUrl, parentId: parentId || null, isActive: isActive !== false } }) })
}
export async function update(req: Request, res: Response) {
  const id = String(req.params.id); const b = req.body || {}; const data: any = {}
  for (const k of ['name','imageUrl','parentId','isActive']) if (b[k]!==undefined) data[k]=b[k]; if (b.slug) data.slug=slugify(b.slug)
  res.json({ data: await prisma.productCategory.update({ where: { id }, data }) })
}
export async function remove(req: Request, res: Response) {
  const id = String(req.params.id); const refs = await prisma.product.count({ where: { categoryId: id } })
  if (refs>0) throw new AppError(400, 'Category has products; reassign before delete.', 'CONFLICT')
  await prisma.productCategory.delete({ where: { id } }); res.json({ ok: true })
}
export async function listBrands(_req: Request, res: Response) { res.json({ data: await prisma.brand.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } }) }) }
export async function createBrand(req: Request, res: Response) { const { name, slug } = req.body||{}; if(!name) throw new AppError(400,'name required','VALIDATION_ERROR'); res.status(201).json({ data: await prisma.brand.create({ data: { name, slug: slugify(slug||name) } }) }) }
export async function listSizes(_req: Request, res: Response) { res.json({ data: await prisma.productSize.findMany({ orderBy: { sortOrder: 'asc' } }) }) }
export async function listColors(_req: Request, res: Response) { res.json({ data: await prisma.productColor.findMany({ orderBy: { name: 'asc' } }) }) }