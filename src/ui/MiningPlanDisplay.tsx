import { MiningPlan } from "../simulation/worldModel";

interface MiningPlanDisplayProps {
  plan: MiningPlan | null;
}

export default function MiningPlanDisplay({ plan }: MiningPlanDisplayProps) {
  if (!plan) return null;

  return (
    <section className="panel-section mining-plan-section">
      <div className="section-header">
        <span>Claude&apos;s Strategic Plan</span>
        <span className="section-pill">AI</span>
      </div>

      {plan.deployment.map((order, i) => (
        <div key={i} className={`plan-order priority-${order.priority}`}>
          <div className="plan-order-header">
            <span className="plan-robot">{order.robot_id}</span>
            <span className={`priority-badge priority-${order.priority}`}>{order.priority}</span>
          </div>
          <div className="plan-route">
            {order.target_zones.map((zone, j) => (
              <span key={zone}>
                {j > 0 && <span className="route-arrow"> → </span>}
                <span className="route-zone">{zone}</span>
              </span>
            ))}
          </div>
          <div className="plan-reason">{order.reason}</div>
        </div>
      ))}

      {plan.ignore_zones.length > 0 && (
        <div className="plan-ignored">
          <strong>Ignored zones:</strong> {plan.ignore_zones.join(", ")}
        </div>
      )}

      {plan.alerts.map((alert, i) => (
        <div key={i} className="plan-alert">
          {alert}
        </div>
      ))}
    </section>
  );
}
