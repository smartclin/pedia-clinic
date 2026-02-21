export const formatCurrency = (amount: number) =>
	new Intl.NumberFormat('ar-EG', {
		currency: 'EGP',
		style: 'currency',
	}).format(amount / 100)
