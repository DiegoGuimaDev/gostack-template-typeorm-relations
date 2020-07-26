import { injectable, inject } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);
    if (!customer) throw new AppError('invalid customer');

    const productsById = await this.productsRepository.findAllById(products);

    if (productsById.length !== products.length)
      throw new AppError('You can not create a order to invalid products');

    // o preço ta no produto

    const productsToOrder = [];

    for (let i = 0; i < products.length; i += 1) {
      const product = products[i];
      if (product.quantity <= 0) throw new AppError('invalid quantity');
      const dbProduct = productsById.find(p => p.id === product.id);

      if (!dbProduct || dbProduct.quantity < product.quantity)
        throw new AppError('invalid quantity');

      dbProduct.quantity -= product.quantity;

      productsToOrder.push({
        product_id: product.id,
        quantity: product.quantity,
        price: dbProduct.price,
      });
    }

    await this.productsRepository.updateQuantity(productsById);

    return this.ordersRepository.create({
      customer,
      products: productsToOrder,
    });
  }
}

export default CreateOrderService;
