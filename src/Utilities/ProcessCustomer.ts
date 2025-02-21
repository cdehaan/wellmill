import { CartType, CartLineType, CustomerType } from "../types";

export default function ProcessCustomer(customer: CustomerType):CustomerType {
  const newCustomer = { ...customer }
  newCustomer.cart = ProcessCart(newCustomer.cart);
  return newCustomer;
}

function ProcessCart(data:CartType|CartLineType[]):CartType {

  let newLines;
  if (Array.isArray(data) && data.every(item => item.type === "cartLine")) {
    newLines = data;
  } else if (!Array.isArray(data) && data.type === 'cart'){
    newLines = data.lines;
  } else {
    throw new Error(`Invalid input to ProcessCart: ${data}`);
  }

  const updatedCartLines:CartLineType[] = newLines.map(line => {
    // Cast then validate relevant values to numbers
    const quantity = parseInt(line.quantity.toString());
    const unitPrice = parseFloat(line.unitPrice.toString());
    const taxRate = parseFloat(line.taxRate.toString());

    if (isNaN(quantity) || isNaN(unitPrice) || isNaN(taxRate)) {
      throw new Error(`Invalid quantity (${quantity}), unit price (${unitPrice}), or tax rate (${taxRate})`);
    }

    return {
      ...line,
      type: 'cartLine',
      quantity: quantity,
      unitPrice: unitPrice,
      taxRate: taxRate,
    };
  });

  const cartQuantity = Math.round(updatedCartLines.reduce((total, lineItem) => { return total + lineItem.quantity; }, 0));
  const cartCost = Math.round(updatedCartLines.reduce((total, lineItem) => { return total + lineItem.unitPrice * (1+lineItem.taxRate) * lineItem.quantity; }, 0));
  const includedTax = Math.round(updatedCartLines.reduce((total, lineItem) => { return total + lineItem.unitPrice * lineItem.taxRate * lineItem.quantity; }, 0));

  return {
    type: 'cart',
    quantity: cartQuantity,
    cost: cartCost,
    includedTax: includedTax,
    lines:updatedCartLines
  };
}
