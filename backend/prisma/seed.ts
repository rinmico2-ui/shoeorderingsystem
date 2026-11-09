import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

const roles = [
  { name: 'SUPER_ADMIN', description: 'Complete system access' },
  { name: 'STORE_MANAGER', description: 'Manage store operations' },
  { name: 'INVENTORY_STAFF', description: 'Manage inventory' },
  { name: 'ORDER_STAFF', description: 'Manage fulfillment' },
  { name: 'CUSTOMER', description: 'Customer account' },
]

async function main() {
  for (const r of roles) await prisma.role.upsert({ where: { name: r.name }, update: {}, create: r })
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } })
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@khyleenescollection.local'
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.upsert({ where: { email }, update: { roleId: adminRole.id }, create: { email, fullName: 'System Admin', passwordHash, roleId: adminRole.id, emailVerifiedAt: new Date() } })

  const sizes = ['36','37','38','39','40','41','42','43','44','45']
  const sizeMap: Record<string,string> = {}
  for (let i=0;i<sizes.length;i++) { const s = await prisma.productSize.upsert({ where: { label: sizes[i] }, update: { sortOrder: i }, create: { label: sizes[i], sortOrder: i } }); sizeMap[sizes[i]] = s.id }
  const colors = [['Black','#202020'],['White','#F7F5F0'],['Sand','#D9CBBE'],['Taupe','#A58D79'],['Navy','#243447'],['Olive','#6B705C']]
  const colorMap: Record<string,string> = {}
  for (const [name, hex] of colors) { const c = await prisma.productColor.upsert({ where: { name }, update: { hex }, create: { name, hex } }); colorMap[name] = c.id }
  const brands = ['Khyleene','AeroStep','UrbanForm','LunaWalk']
  const brandMap: Record<string,string> = {}
  for (const b of brands) { const r = await prisma.brand.upsert({ where: { slug: b.toLowerCase() }, update: {}, create: { name: b, slug: b.toLowerCase() } }); brandMap[b]=r.id }
  const cats = [['Sneakers','sneakers'],['Casual Shoes','casual'],['Formal Shoes','formal'],['Sandals','sandals'],["Men's Shoes",'men'],["Women's Shoes",'women']]
  const catMap: Record<string,string> = {}
  for (const [name, slug] of cats) { const c = await prisma.productCategory.upsert({ where: { slug }, update: {}, create: { name, slug } }); catMap[slug]=c.id }

  const baseProducts = Array.from({length: 20}).map((_,i)=> ({
    name: `Khyleene ${['Classic','Metro','Aero','Vista','Prime'][i%5]} ${['Sneaker','Loafer','Runner','Oxford','Slide'][i%5]} ${i+1}`,
    slug: `khyleene-shoe-${i+1}`,
    categoryId: catMap[['sneakers','casual','formal','sandals','men','women'][i%6]],
    brandId: brandMap[brands[i%brands.length]],
    basePrice: 1899 + (i%8)*450,
    compareAtPrice: i%3===0 ? 1899 + (i%8)*450 + 500 : null,
  }))
  for (const p of baseProducts) {
    const product = await prisma.product.upsert({ where: { slug: p.slug }, update: { name: p.name, basePrice: p.basePrice, compareAtPrice: p.compareAtPrice, isPublished: true, isFeatured: iFeatured(p.slug) }, create: { ...p, description: 'Premium footwear designed for comfort and everyday style. Materials selected for durability and a refined look.', specifications: { upper: 'Synthetic/Mesh', sole: 'Rubber', fit: 'True to size' }, isPublished: true, isFeatured: iFeatured(p.slug) } })
    await prisma.productImage.upsert({ where: { id: `${product.id}-img1` }, update: {}, create: { id: `${product.id}-img1`, productId: product.id, url: `https://placehold.co/800x800/F7F5F0/202020?text=${encodeURIComponent(product.name)}`, alt: product.name, sortOrder: 0 } }).catch(()=>null)
    const variantColors = ['Black','White']
    const variantSizes = ['39','40','41']
    for (const vc of variantColors) for (const vs of variantSizes) {
      const sku = `${product.slug}-${vc}-${vs}`.toUpperCase().replace(/[^A-Z0-9]+/g,'-')
      const variant = await prisma.productVariant.upsert({ where: { sku }, update: { isActive: true }, create: { productId: product.id, sizeId: sizeMap[vs], colorId: colorMap[vc], sku, isActive: true } })
      const qty = (vc==='Black' && vs==='40') ? 1 : 12
      await prisma.inventory.upsert({ where: { variantId: variant.id }, update: {}, create: { variantId: variant.id, quantityOnHand: qty, quantityReserved: 0, lowStockThreshold: 3 } })
    }
  }

  const coupons = [{ code:'WELCOME10', type:'percent', value:10, minPurchase:1500, isActive:true }, { code:'SAVE200', type:'fixed', value:200, minPurchase:2500, isActive:true }]
  for (const c of coupons) await prisma.coupon.upsert({ where: { code: c.code }, update: c as any, create: c as any })
  console.log('Seed complete. Admin:', email)
}
function iFeatured(slug:string){ return ['khyleene-shoe-1','khyleene-shoe-2','khyleene-shoe-3','khyleene-shoe-4'].includes(slug) }
main().catch(e=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())