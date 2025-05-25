
# Configuração de Webhooks do Stripe

Este documento contém informações importantes sobre as URLs de webhook do Stripe para diferentes ambientes.

## URLs de Webhook

### Ambiente de Desenvolvimento
```
https://28e4b557-7792-4b03-b33e-93489b7586b5-00-33goki6qofjtz.riker.replit.dev/api/stripe/webhook
```

### Ambiente de Produção
```
https://partiusaara.replit.app/api/stripe/webhook
```

## Configuração no Painel do Stripe

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/)
2. Navegue até Desenvolvedores > Webhooks
3. Adicione um endpoint com a URL correspondente ao ambiente
4. Selecione os eventos que deseja receber (recomendado: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`)
5. Salve a chave secreta do webhook gerada e configure-a nas variáveis de ambiente correspondentes

## Variáveis de Ambiente Necessárias

- `STRIPE_WEBHOOK_SECRET_TEST`: Chave secreta do webhook para ambiente de teste
- `STRIPE_WEBHOOK_SECRET_LIVE`: Chave secreta do webhook para ambiente de produção

## Testando o Webhook

Para testar o webhook localmente, você pode usar a CLI do Stripe para encaminhar eventos:

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

Para ambiente de produção, você pode usar o painel do Stripe para enviar eventos de teste.
