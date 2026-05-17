import React from 'react';

export default function PaymentMethod() {
    return (
        <div className="bg-gray-100 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-sm p-8 md:p-12 border border-gray-100">
                <h1 className="text-4xl font-black text-gray-900 mb-8 uppercase tracking-tight text-center">
                    Payment Method
                </h1>
                
                <div className="space-y-8 text-gray-700 leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Decentralized Payments</h2>
                        <p>
                            D2F Web3 Ticketing operates on the Oasis Sapphire blockchain. Unlike traditional platforms, we do not handle your money directly through centralized bank transfers or credit cards. All payments are processed automatically by smart contracts using cryptocurrency.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Supported Currency: ROSE</h2>
                        <p>
                            The primary currency for all transactions on our platform is <strong>ROSE</strong>, the native token of the Oasis Network. You will need ROSE in your wallet to purchase tickets, list them for resale, or pay for transaction gas fees.
                        </p>
                    </section>

                    <section className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-3">How to Pay:</h2>
                        <ol className="list-decimal pl-6 space-y-4">
                            <li>
                                <strong>Setup MetaMask:</strong> Install the MetaMask browser extension and create a wallet.
                            </li>
                            <li>
                                <strong>Add Oasis Sapphire Network:</strong> Our platform will automatically prompt you to add the Oasis Sapphire Testnet/Mainnet when you connect your wallet.
                            </li>
                            <li>
                                <strong>Acquire ROSE:</strong> Obtain ROSE tokens from an exchange or a faucet (for testnet) and send them to your MetaMask address.
                            </li>
                            <li>
                                <strong>Confirm Transaction:</strong> When you click "Buy Ticket", MetaMask will pop up asking you to confirm the transaction and the gas fee.
                            </li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Security & Refunds</h2>
                        <p>
                            Once a transaction is confirmed on the blockchain, it cannot be reversed. If an event is officially cancelled by the organizer, the smart contract allows ticket holders to claim a refund of the ticket price directly through the platform.
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                    <p className="text-gray-400 text-sm">
                        For any issues regarding payments, please contact our support team at <a href="mailto:neverwintop@gmail.com" className="text-blue-500 hover:underline">neverwintop@gmail.com</a>.
                    </p>
                </div>
            </div>
        </div>
    );
}
