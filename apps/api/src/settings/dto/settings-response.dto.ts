import { OrderType, TimeInForce } from '../../orders/enums/order.enums';
import { CostBasisMethod } from '../../portfolio/enums/cost-basis.enums';

export interface SettingsResponse {
  account: {
    email: string;
    createdAt: Date;
  };
  trading: {
    defaultOrderType: OrderType;
    defaultTimeInForce: TimeInForce;
    defaultCostBasisMethod: CostBasisMethod;
  };
  display: {
    theme: 'light' | 'dark';
    tourCompleted: boolean;
  };
}
