export default function Buy() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    const checkout = () => {
        alert("Thanh toán demo thành công!");
        localStorage.removeItem("cart");
    };

    return (
        <div className="p-6">
            {cart.map((c, i) => (
                <div key={i}>{c.title} - {c.price}</div>
            ))}

            <button onClick={checkout} className="bg-blue-500 text-white px-4 py-2">
                Thanh toán
            </button>
        </div>
    );
}