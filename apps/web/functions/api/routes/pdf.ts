import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

type Env = {
  DB: D1Database
  JWT_SECRET: string
}

const pdf = new Hono<{ Bindings: Env }>()

pdf.use('/*', jwt({ secret: c => c.env.JWT_SECRET }))

pdf.post('/generate', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { promotionIds } = body

  if (!promotionIds || !Array.isArray(promotionIds) || promotionIds.length === 0) {
    return c.json({ error: 'promotionIds é obrigatório' }, 400)
  }

  const promotions: Record<string, unknown>[] = []
  for (const id of promotionIds) {
    const promo = await db.prepare('SELECT * FROM promotions WHERE id = ?').bind(id).first()
    if (promo) {
      const stores = await db
        .prepare(
          `SELECT s.name, s.city FROM stores s
           INNER JOIN promotion_stores ps ON s.id = ps.store_id
           WHERE ps.promotion_id = ?`
        )
        .bind(id)
        .all()
      promotions.push({ ...promo, stores: stores.results })
    }
  }

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let y = 800
  page.drawText('CATÁLOGO DE PROMOÇÕES', {
    x: 180,
    y,
    size: 18,
    font: helveticaBold,
    color: rgb(0.2, 0.4, 0.6),
  })

  y -= 40
  page.drawText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, {
    x: 50,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })

  y -= 30

  for (const promo of promotions) {
    if (y < 150) {
      const newPage = pdfDoc.addPage([595.28, 841.89])
      y = 800
    }

    page.drawText(promo.description as string || '', {
      x: 50,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    })

    y -= 20

    page.drawText(`Código: ${promo.code || 'N/A'}`, {
      x: 50,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    })

    y -= 15

    page.drawText(
      `Varejo: ${(promo.retail_price as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      {
        x: 50,
        y,
        size: 12,
        font: helveticaBold,
        color: rgb(0.2, 0.6, 0.2),
      }
    )

    if (promo.wholesale_price) {
      page.drawText(
        `Atacado: ${(promo.wholesale_price as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        {
          x: 200,
          y,
          size: 12,
          font: helveticaBold,
          color: rgb(0.2, 0.6, 0.2),
        }
      )
    }

    y -= 15
    page.drawText(
      `Validade: ${new Date(promo.start_date as string).toLocaleDateString('pt-BR')} a ${new Date(promo.end_date as string).toLocaleDateString('pt-BR')}`,
      {
        x: 50,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      }
    )

    y -= 15

    const stores = promo.stores as { name: string; city: string }[]
    if (stores && stores.length > 0) {
      page.drawText('Lojas:', {
        x: 50,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      })
      y -= 12
      for (const store of stores) {
        page.drawText(`• ${store.name}${store.city ? ` - ${store.city}` : ''}`, {
          x: 60,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4),
        })
        y -= 12
      }
    }

    if (promo.notes) {
      y -= 5
      page.drawText(`Obs: ${promo.notes as string}`, {
        x: 50,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    y -= 25
    page.drawLine({
      start: { x: 50, y },
      end: { x: 545, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    })
    y -= 15
  }

  const pdfBytes = await pdfDoc.save()

  return c.json({
    url: `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`,
    filename: `promocoes_${Date.now()}.pdf`,
  })
})

export { pdf }
