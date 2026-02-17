# Integración Shopify para ChateaYA — Análisis Técnico

## Resumen Ejecutivo

Integrar Shopify en ChateaYA para que los agentes y el chatbot IA puedan:
1. Sincronizar el catálogo de productos de Shopify
2. Enviar tarjetas de productos dentro del chat
3. Crear carritos y pedidos desde la conversación
4. Generar links de pago (Shopify Checkout o Stripe)
5. La IA entienda el catálogo y levante pedidos automáticamente

---

## Arquitectura de la Integración

### Flujo General

```
┌─────────────┐     OAuth 2.0      ┌──────────────┐
│  ChateaYA   │◄──────────────────►│   Shopify    │
│  Backend    │     Admin API       │   Store      │
│  (Express)  │     Storefront API  │              │
└──────┬──────┘                     └──────────────┘
       │
       │  Webhooks (products/update, orders/create)
       │
       ▼
┌──────────────┐    Socket.IO     ┌──────────────┐
│  PostgreSQL  │◄────────────────►│   Frontend   │
│  (productos, │                  │   (React)    │
│   pedidos)   │                  │              │
└──────────────┘                  └──────────────┘
       │
       ▼
┌──────────────┐
│  Bull Queue  │  → Sync productos
│  (Redis)     │  → Procesar pedidos
└──────────────┘
```

---

## FASE 1: Conexión OAuth con Shopify

### 1.1 Modelo de Datos: ShopifyConnection

**Archivo:** `backend/src/models/ShopifyConnection.ts`

```typescript
// Sigue el mismo patrón que MetaConnection.ts
@Table({ tableName: "ShopifyConnections" })
class ShopifyConnection extends Model<ShopifyConnection> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  shopDomain: string;          // "mitienda.myshopify.com"

  @Column
  accessToken: string;         // Token OAuth permanente

  @Column
  shopName: string;            // Nombre de la tienda

  @Column
  shopEmail: string;

  @Column
  currency: string;            // "USD", "MXN", etc.

  @Default("disconnected")
  @Column
  status: string;              // "connected" | "disconnected" | "syncing"

  @Column
  lastSyncAt: Date;

  @Column
  webhookSecret: string;       // Para verificar webhooks de Shopify

  @Column
  storefrontAccessToken: string; // Token Storefront API (para checkout)

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;
}
```

### 1.2 Flujo OAuth

Shopify usa OAuth 2.0 estándar. Se necesita crear una **Shopify App** (custom app o public app):

**Ruta de instalación:**
1. Usuario va a Settings → Integraciones → Shopify
2. Ingresa su dominio: `mitienda.myshopify.com`
3. Backend redirige a: `https://{shop}/admin/oauth/authorize?client_id={API_KEY}&scope={SCOPES}&redirect_uri={CALLBACK_URL}`
4. Shopify redirige de vuelta con `code`
5. Backend intercambia `code` por `access_token` permanente
6. Se guarda en ShopifyConnection

**Scopes necesarios:**
```
read_products        → Leer catálogo
write_draft_orders   → Crear borradores de pedido
write_orders         → Crear pedidos
read_orders          → Ver pedidos
read_inventory       → Ver inventario
write_checkouts      → Crear checkouts (Storefront API)
```

**Archivos a crear:**

```
backend/src/
├── controllers/ShopifyController.ts
│   ├── install()      → Redirige a OAuth de Shopify
│   ├── callback()     → Recibe code, intercambia por token
│   ├── disconnect()   → Revoca acceso
│   └── status()       → Estado de conexión
│
├── services/ShopifyServices/
│   ├── ShopifyAuthService.ts       → OAuth flow
│   ├── ShopifySyncService.ts       → Sync de productos
│   ├── ShopifyOrderService.ts      → Crear pedidos/carritos
│   ├── ShopifyWebhookService.ts    → Procesar webhooks
│   └── ShopifyCheckoutService.ts   → Generar links de pago
│
├── routes/shopifyRoutes.ts
│   ├── GET  /shopify/install
│   ├── GET  /shopify/callback
│   ├── POST /shopify/webhook
│   ├── GET  /shopify/status
│   ├── POST /shopify/disconnect
│   ├── GET  /shopify/products
│   ├── POST /shopify/cart
│   └── POST /shopify/checkout
```

**Variables de entorno nuevas (.env):**
```
SHOPIFY_API_KEY=tu_api_key
SHOPIFY_API_SECRET=tu_api_secret
SHOPIFY_SCOPES=read_products,write_draft_orders,write_orders,read_orders,read_inventory
SHOPIFY_APP_URL=https://app.chateaya.app
```

---

## FASE 2: Sincronización del Catálogo

### 2.1 Modelo: ShopifyProduct

**Archivo:** `backend/src/models/ShopifyProduct.ts`

```typescript
@Table({ tableName: "ShopifyProducts" })
class ShopifyProduct extends Model<ShopifyProduct> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  shopifyProductId: string;     // ID en Shopify (ej: "7654321098765")

  @Column
  title: string;                // "Camiseta Premium"

  @Column(DataType.TEXT)
  description: string;          // Descripción HTML

  @Column
  handle: string;               // "camiseta-premium" (slug URL)

  @Column
  vendor: string;               // Marca/proveedor

  @Column
  productType: string;          // "Ropa", "Electrónica"

  @Column(DataType.JSONB)
  tags: string[];               // ["oferta", "nuevo", "verano"]

  @Column
  imageUrl: string;             // URL imagen principal

  @Column(DataType.JSONB)
  images: object[];             // Todas las imágenes

  @Column(DataType.DECIMAL(10, 2))
  priceMin: number;             // Precio mínimo (variantes)

  @Column(DataType.DECIMAL(10, 2))
  priceMax: number;             // Precio máximo (variantes)

  @Column
  currency: string;

  @Column(DataType.JSONB)
  variants: object[];
  // [{
  //   variantId: "123",
  //   title: "Talla M / Azul",
  //   price: "29.99",
  //   sku: "CAM-M-AZ",
  //   inventoryQuantity: 15,
  //   available: true
  // }]

  @Column
  status: string;               // "active" | "draft" | "archived"

  @Column
  totalInventory: number;       // Stock total

  @Column
  productUrl: string;           // URL completa en Shopify

  @ForeignKey(() => ShopifyConnection)
  @Column
  shopifyConnectionId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;
}
```

### 2.2 Estrategia de Sincronización

**Sync inicial (al conectar):**
- Se encola un job en Bull Queue: `ShopifySyncQueue`
- Usa la **Admin REST API** de Shopify: `GET /admin/api/2024-01/products.json`
- Paginación: 250 productos por request (máximo de Shopify)
- Se insertan/actualizan en batch via `bulkCreate` con `updateOnDuplicate`

**Sync incremental (webhooks):**
Registrar webhooks al completar OAuth:
```
POST /admin/api/2024-01/webhooks.json
{
  "topic": "products/create",
  "address": "https://app.chateaya.app/api/shopify/webhook",
  "format": "json"
}
```

**Webhooks a registrar:**
| Topic | Acción |
|-------|--------|
| `products/create` | Insertar producto nuevo |
| `products/update` | Actualizar producto existente |
| `products/delete` | Marcar como archived |
| `inventory_levels/update` | Actualizar stock |
| `orders/create` | Notificar pedido nuevo |
| `orders/fulfilled` | Notificar envío |

**Bull Queue para sync:**
```typescript
// En queues.ts
export const shopifySyncQueue = new BullQueue("ShopifySyncQueue", connection);

shopifySyncQueue.process("full-sync", async (job) => {
  const { shopifyConnectionId } = job.data;
  await ShopifySyncService.fullSync(shopifyConnectionId);
});

shopifySyncQueue.process("product-update", async (job) => {
  const { shopifyConnectionId, productData } = job.data;
  await ShopifySyncService.upsertProduct(shopifyConnectionId, productData);
});
```

---

## FASE 3: Productos en el Chat

### 3.1 Nuevo Tipo de Mensaje: "product_card"

Agregar un nuevo `mediaType` al sistema de mensajes existente.

**En el modelo Message, el campo `dataJson` almacenará:**
```json
{
  "type": "product_card",
  "products": [
    {
      "shopifyProductId": "7654321098765",
      "title": "Camiseta Premium",
      "imageUrl": "https://cdn.shopify.com/...",
      "price": "29.99",
      "currency": "USD",
      "variants": ["Talla M", "Talla L"],
      "productUrl": "https://mitienda.myshopify.com/products/camiseta-premium",
      "available": true,
      "inventoryQuantity": 15
    }
  ]
}
```

### 3.2 Componente Frontend: ProductCard

**Archivo:** `frontend/src/components/ProductCard/index.js`

El componente se renderiza dentro de `MessagesList` cuando `mediaType === "product_card"`:

```
┌─────────────────────────────────┐
│  [Imagen]                       │
│                                 │
│  Camiseta Premium               │
│  $29.99 USD                     │
│  ✅ En stock (15 disponibles)   │
│                                 │
│  [Agregar al Carrito] [Ver]     │
└─────────────────────────────────┘
```

### 3.3 Selector de Productos (para el agente)

**Archivo:** `frontend/src/components/ShopifyProductPicker/index.js`

Botón en `MessageInputCustom` → Abre modal con:
- Buscador de productos (búsqueda en la tabla local ShopifyProduct)
- Filtros por categoría, rango de precio, disponibilidad
- Preview de la tarjeta antes de enviar
- Selección múltiple (enviar varios productos)

**API endpoint:**
```
GET /api/shopify/products?search=camiseta&category=ropa&available=true&page=1
```

### 3.4 Cómo se envía al cliente

**Para WhatsApp:**
WhatsApp no soporta "cards" nativas (excepto con API oficial + catálogo de WhatsApp). Entonces:
- Se envía como **imagen + texto formateado**:
```
🛍️ *Camiseta Premium*
💰 Precio: $29.99 USD
📦 En stock: 15 disponibles

👉 Ver producto: https://mitienda.myshopify.com/products/camiseta-premium
🛒 Comprar: https://mitienda.myshopify.com/cart/VARIANT_ID:1
```

**Para la interfaz web de ChateaYA:**
- Se renderiza la tarjeta visual (ProductCard component)

**Para Instagram/Facebook:**
- Se envía como imagen + texto (similar a WhatsApp)
- Con la API oficial de Meta se pueden usar templates de producto

---

## FASE 4: Carrito y Pedidos desde el Chat

### 4.1 Modelo: ShopifyCart (carrito temporal por ticket)

**Archivo:** `backend/src/models/ShopifyCart.ts`

```typescript
@Table({ tableName: "ShopifyCarts" })
class ShopifyCart extends Model<ShopifyCart> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;             // Un carrito por conversación

  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @Column(DataType.JSONB)
  items: object[];
  // [{
  //   shopifyProductId: "765...",
  //   variantId: "432...",
  //   title: "Camiseta Premium - Talla M",
  //   quantity: 2,
  //   price: "29.99",
  //   imageUrl: "https://..."
  // }]

  @Column(DataType.DECIMAL(10, 2))
  subtotal: number;

  @Column
  currency: string;

  @Column
  status: string;               // "active" | "checkout" | "completed" | "abandoned"

  @Column
  checkoutUrl: string;          // URL de checkout generada

  @Column
  shopifyOrderId: string;       // ID del pedido cuando se confirma

  @Column
  shopifyOrderNumber: string;   // #1001

  @ForeignKey(() => ShopifyConnection)
  @Column
  shopifyConnectionId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;
}
```

### 4.2 Flujo del Carrito

```
Cliente: "Quiero la camiseta premium talla M"
    │
    ▼
[Agente o IA] → POST /api/shopify/cart/add
    {
      ticketId: 123,
      variantId: "43210987654",
      quantity: 1
    }
    │
    ▼
[Sistema actualiza ShopifyCart]
    │
    ▼
[Se envía mensaje en el chat con resumen del carrito]

    🛒 *Tu Carrito*
    ─────────────
    1x Camiseta Premium (M) — $29.99
    ─────────────
    Subtotal: $29.99 USD

    ¿Deseas agregar algo más o proceder al pago?
```

### 4.3 API Endpoints del Carrito

```
POST   /api/shopify/cart/add         → Agregar item
PUT    /api/shopify/cart/update       → Cambiar cantidad
DELETE /api/shopify/cart/remove       → Quitar item
GET    /api/shopify/cart/:ticketId    → Ver carrito actual
POST   /api/shopify/cart/checkout     → Generar link de pago
POST   /api/shopify/cart/clear        → Vaciar carrito
```

### 4.4 Componente Frontend: CartDrawer

**Archivo:** `frontend/src/components/ShopifyCartDrawer/index.js`

Panel lateral en el Ticket que muestra:
- Items del carrito con imagen, cantidad, precio
- Botones +/- para ajustar cantidades
- Subtotal en tiempo real
- Botón "Generar Link de Pago"
- Estado del pedido si ya se generó

---

## FASE 5: Checkout y Pagos

### 5.1 Opción A: Shopify Checkout (Recomendado)

Usar la **Storefront API** de Shopify para crear un checkout:

```typescript
// ShopifyCheckoutService.ts
async function createCheckout(cart: ShopifyCart): Promise<string> {
  const shopify = new Shopify.Clients.Storefront(
    shopDomain,
    storefrontAccessToken
  );

  const checkout = await shopify.query({
    data: `mutation {
      checkoutCreate(input: {
        lineItems: [
          ${cart.items.map(item =>
            `{ variantId: "gid://shopify/ProductVariant/${item.variantId}", quantity: ${item.quantity} }`
          ).join(",")}
        ]
      }) {
        checkout {
          webUrl       # ← Este es el link de pago
          id
          totalPriceV2 { amount currencyCode }
        }
      }
    }`
  });

  return checkout.body.data.checkoutCreate.checkout.webUrl;
}
```

**Ventaja:** El cliente paga directamente en Shopify con todas las pasarelas que tenga configuradas (tarjeta, PayPal, etc.)

### 5.2 Opción B: Draft Order + Stripe

Para más control, crear un **Draft Order** en Shopify y cobrar via Stripe:

```typescript
// Crear Draft Order en Shopify
const draftOrder = await shopifyApi.post("/admin/api/2024-01/draft_orders.json", {
  draft_order: {
    line_items: cart.items.map(item => ({
      variant_id: item.variantId,
      quantity: item.quantity
    })),
    customer: {
      email: contact.email,
      first_name: contact.name
    }
  }
});

// Generar link de Stripe (ya existe la integración)
const session = await stripe.checkout.sessions.create({
  line_items: cart.items.map(item => ({
    price_data: {
      currency: cart.currency.toLowerCase(),
      product_data: {
        name: item.title,
        images: [item.imageUrl]
      },
      unit_amount: Math.round(item.price * 100)
    },
    quantity: item.quantity
  })),
  mode: "payment",
  success_url: `${FRONTEND_URL}/checkout/success?order=${draftOrder.id}`,
  cancel_url: `${FRONTEND_URL}/checkout/cancel`,
  metadata: {
    shopifyDraftOrderId: draftOrder.id,
    ticketId: cart.ticketId,
    companyId: cart.companyId
  }
});
```

### 5.3 Flujo de Pago Completo

```
Agente: [Click "Generar Link de Pago"]
    │
    ▼
POST /api/shopify/cart/checkout
    │
    ├─► Crea checkout en Shopify (Storefront API)
    │   └─► Retorna: https://mitienda.myshopify.com/checkouts/abc123
    │
    ▼
[Se envía mensaje automático al cliente]

    💳 *Link de Pago*
    ─────────────
    Tu pedido está listo:
    1x Camiseta Premium (M) — $29.99

    Total: $29.99 USD

    👉 Pagar aquí: https://mitienda.myshopify.com/checkouts/abc123

    Este link es válido por 24 horas.

    │
    ▼
[Cliente paga en Shopify]
    │
    ▼
[Webhook orders/create llega a ChateaYA]
    │
    ▼
[Se actualiza ShopifyCart.status = "completed"]
[Se envía mensaje de confirmación al chat]

    ✅ *Pedido Confirmado*
    Pedido #1001
    Estado: Pagado
    Gracias por tu compra!
```

---

## FASE 6: Integración con IA

### 6.1 Contexto de Productos para OpenAI

Modificar `OpenAiService.ts` para incluir el catálogo en el prompt del sistema:

```typescript
// Cuando el ticket tiene una ShopifyConnection activa:
const products = await ShopifyProduct.findAll({
  where: {
    companyId,
    status: "active"
  },
  attributes: ["title", "description", "priceMin", "currency", "totalInventory", "handle", "productType", "tags"],
  limit: 100,  // Top 100 productos (o filtrar por relevancia)
  order: [["totalInventory", "DESC"]]
});

const productCatalog = products.map(p =>
  `- ${p.title} | $${p.priceMin} ${p.currency} | Stock: ${p.totalInventory} | Tipo: ${p.productType} | Tags: ${p.tags?.join(", ")}`
).join("\n");

const systemPrompt = `
${prompt.prompt}

## CATÁLOGO DE PRODUCTOS DISPONIBLES:
${productCatalog}

## INSTRUCCIONES PARA VENTAS:
- Cuando el cliente pregunte por un producto, busca en el catálogo y recomienda opciones.
- Si el cliente quiere comprar, responde con el formato exacto:
  ACCIÓN:AGREGAR_CARRITO|producto={handle}|cantidad={N}
- Si el cliente quiere ver su carrito, responde:
  ACCIÓN:VER_CARRITO
- Si el cliente quiere pagar, responde:
  ACCIÓN:GENERAR_CHECKOUT
- Si no encuentras el producto, sugiérele productos similares del catálogo.
- Siempre confirma la selección antes de agregar al carrito.
`;
```

### 6.2 Procesador de Acciones IA

**Archivo:** `backend/src/services/ShopifyServices/ShopifyAIActionProcessor.ts`

Después de recibir la respuesta de OpenAI, parsear acciones:

```typescript
async function processAIResponse(
  responseText: string,
  ticketId: number,
  companyId: number
): Promise<string> {

  // Detectar acciones en la respuesta
  const actionMatch = responseText.match(/ACCIÓN:(\w+)\|?(.*)/);

  if (!actionMatch) return responseText; // Solo texto, enviar normal

  const [, action, params] = actionMatch;
  const cleanResponse = responseText.replace(/ACCIÓN:.+/, "").trim();

  switch (action) {
    case "AGREGAR_CARRITO": {
      const handle = params.match(/producto=(\S+)/)?.[1];
      const qty = parseInt(params.match(/cantidad=(\d+)/)?.[1] || "1");
      const product = await ShopifyProduct.findOne({ where: { handle, companyId } });

      if (product) {
        await ShopifyCartService.addItem(ticketId, product.variants[0].variantId, qty);
        return `${cleanResponse}\n\n🛒 Se agregó ${qty}x ${product.title} al carrito.`;
      }
      return `${cleanResponse}\n\nNo encontré ese producto. ¿Podrías ser más específico?`;
    }

    case "VER_CARRITO": {
      const cart = await ShopifyCart.findOne({ where: { ticketId, status: "active" } });
      if (!cart || cart.items.length === 0) {
        return `${cleanResponse}\n\nEl carrito está vacío.`;
      }
      const cartText = cart.items.map(i => `${i.quantity}x ${i.title} — $${i.price}`).join("\n");
      return `${cleanResponse}\n\n🛒 *Tu Carrito:*\n${cartText}\n\nSubtotal: $${cart.subtotal} ${cart.currency}`;
    }

    case "GENERAR_CHECKOUT": {
      const checkoutUrl = await ShopifyCheckoutService.createCheckout(ticketId);
      return `${cleanResponse}\n\n💳 Aquí está tu link de pago: ${checkoutUrl}`;
    }
  }

  return cleanResponse;
}
```

### 6.3 Ejemplo de Conversación con IA

```
Cliente: "Hola, busco una camiseta para hombre"
IA: "¡Hola! Tenemos estas opciones:
     1. Camiseta Premium - $29.99 (Tallas S, M, L, XL)
     2. Camiseta Sport - $24.99 (Tallas M, L, XL)
     ¿Cuál te interesa?"

Cliente: "La premium talla L"
IA: "Excelente elección. ¿Confirmo 1x Camiseta Premium talla L por $29.99?"

Cliente: "Sí, y también la sport en M"
IA: "Perfecto, agregado:
     🛒 Tu Carrito:
     1x Camiseta Premium (L) — $29.99
     1x Camiseta Sport (M) — $24.99
     Subtotal: $54.98 USD

     ¿Deseas algo más o generamos el link de pago?"

Cliente: "Ya con eso, mándame el link"
IA: "💳 Aquí está tu link de pago:
     https://mitienda.myshopify.com/checkouts/abc123

     El total es $54.98 USD. El link es válido por 24 horas."
```

---

## FASE 7: Panel de Administración Frontend

### 7.1 Página de Configuración Shopify

**Archivo:** `frontend/src/pages/ShopifyConfig/index.js`

**Ruta:** `/shopify-config`

**Secciones:**
1. **Conexión** — Conectar/Desconectar tienda Shopify
2. **Sincronización** — Estado del sync, botón re-sync manual, última fecha
3. **Catálogo** — Tabla de productos sincronizados con búsqueda
4. **Pedidos** — Historial de pedidos creados desde ChateaYA
5. **Configuración IA** — Toggle para habilitar ventas IA, prompt personalizado

### 7.2 Panel de Pedidos en el Ticket

**Archivo:** `frontend/src/components/ShopifyOrderPanel/index.js`

En la vista de ticket (sidebar derecho), nueva pestaña "Pedidos":
- Carrito actual del cliente
- Historial de pedidos anteriores del contacto
- Estado de cada pedido (pagado, enviado, entregado)
- Acciones rápidas (crear pedido, enviar link de pago)

---

## Resumen de Archivos a Crear

### Backend (17 archivos nuevos)

```
backend/src/
├── models/
│   ├── ShopifyConnection.ts
│   ├── ShopifyProduct.ts
│   └── ShopifyCart.ts
│
├── controllers/
│   └── ShopifyController.ts
│
├── services/ShopifyServices/
│   ├── ShopifyAuthService.ts
│   ├── ShopifySyncService.ts
│   ├── ShopifyProductService.ts
│   ├── ShopifyCartService.ts
│   ├── ShopifyCheckoutService.ts
│   ├── ShopifyOrderService.ts
│   ├── ShopifyWebhookService.ts
│   └── ShopifyAIActionProcessor.ts
│
├── routes/
│   └── shopifyRoutes.ts
│
└── database/migrations/
    ├── XXXX-create-shopify-connections.ts
    ├── XXXX-create-shopify-products.ts
    └── XXXX-create-shopify-carts.ts
```

### Frontend (6 archivos nuevos)

```
frontend/src/
├── pages/
│   └── ShopifyConfig/index.js
│
├── components/
│   ├── ProductCard/index.js
│   ├── ShopifyProductPicker/index.js
│   ├── ShopifyCartDrawer/index.js
│   └── ShopifyOrderPanel/index.js
│
└── context/
    └── ShopifyContext.js (opcional)
```

### Archivos Existentes a Modificar

```
backend/src/
├── routes/index.ts           → Agregar shopifyRoutes
├── queues.ts                 → Agregar ShopifySyncQueue
├── models/index.ts           → Registrar nuevos modelos
├── services/IntegrationsServices/OpenAiService.ts → Inyectar catálogo al prompt
├── services/WbotServices/wbotMessageListener.ts   → Procesar acciones IA de Shopify

frontend/src/
├── routes/index.js           → Agregar ruta /shopify-config
├── layout/index.js           → Agregar item en menú lateral
├── components/MessagesList/index.js  → Renderizar ProductCard
├── components/MessageInputCustom/index.js → Agregar botón de productos
├── components/Ticket/index.js → Agregar pestaña de pedidos
```

---

## Dependencias NPM Nuevas

### Backend
```json
{
  "@shopify/shopify-api": "^11.0.0"
}
```

Solo se necesita una dependencia. La librería oficial de Shopify incluye:
- OAuth flow
- Admin API REST client
- Storefront API GraphQL client
- Webhook verification

### Frontend
No se necesitan dependencias nuevas. Se usa Material-UI existente.

---

## Plan de Implementación por Fases

| Fase | Alcance | Estimación |
|------|---------|-----------|
| **1** | OAuth + Conexión Shopify | Modelos, migración, OAuth flow, UI de conexión |
| **2** | Sync catálogo | Sync inicial, webhooks, tabla de productos |
| **3** | Productos en chat | ProductCard, ProductPicker, envío de tarjetas |
| **4** | Carrito | CRUD carrito, CartDrawer, resumen en chat |
| **5** | Checkout/Pagos | Storefront checkout, links de pago, confirmación |
| **6** | IA + Shopify | Prompt con catálogo, procesador de acciones |

### Orden recomendado: 1 → 2 → 3 → 4 → 5 → 6

Cada fase es funcional por sí sola. Se puede lanzar a producción después de cada fase.

---

## Consideraciones Técnicas

### Rendimiento
- **Catálogo grande (10,000+ productos):** No inyectar todo al prompt de OpenAI. Usar búsqueda semántica o filtrar por keywords del mensaje del cliente antes de enviar a la IA.
- **Rate limits de Shopify:** REST API = 2 requests/segundo (bucket de 40). Usar Bull Queue con limiter para respetar esto.
- **Cache de productos:** Guardar en la base de datos local, actualizar via webhooks. No consultar Shopify en cada búsqueda.

### Seguridad
- **Tokens de Shopify:** Encriptar `accessToken` en la base de datos (mismo patrón que MetaConnection.accessToken).
- **Webhook verification:** Validar HMAC-SHA256 en cada webhook de Shopify.
- **Company isolation:** Todos los queries filtran por `companyId` (patrón existente).

### Escalabilidad
- **Multi-tenant:** Cada empresa conecta su propia tienda Shopify. No hay interferencia entre empresas.
- **Webhooks:** Un solo endpoint `/api/shopify/webhook` que rutea por `shopDomain` en el header.
