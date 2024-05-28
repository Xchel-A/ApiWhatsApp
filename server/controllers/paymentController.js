const stripe = require('stripe')('your-stripe-secret-key');

const processPayment = async (req, res) => {
    const { token, subscriptionDuration, userId } = req.body;
    const amount = subscriptionDuration * 150 * 100; // convertir a centavos

    try {
        const charge = await stripe.charges.create({
            amount: amount,
            currency: 'usd',
            description: `Suscripción por ${subscriptionDuration} año(s) para el usuario ${userId}`,
            source: token
        });

        // Aquí puedes actualizar la suscripción del usuario en tu base de datos

        res.status(200).json({ message: 'Pago realizado con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error al procesar el pago', error: error.message });
    }
};

module.exports = { processPayment };
