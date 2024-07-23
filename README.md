
# 1ONE Project

## Overview

The 1ONE project is a smart contract implementation in Solidity designed for a blockchain-based token. It includes various contracts for handling token operations, market regulation, and dividend distribution.

## Project Structure

```
1ONE-main/
├── LICENSE
├── TheONECoin.js
├── abstract/
│   └── DividendPayingToken.sol
├── contracts/
│   ├── Address.sol
│   ├── MarketRegulator.sol
│   ├── ONE.sol
│   └── ONEDividendTracker.sol
├── interfaces/
│   ├── IFactory.sol
│   └── IRouter.sol
└── scripts/
    └── zip_project.py
```

### Key Files and Directories

- **LICENSE**: Contains the license information for the project.
- **TheONECoin.js**: JavaScript file for interacting with the ONE token.
- **abstract/DividendPayingToken.sol**: Abstract contract for dividend-paying tokens.
- **contracts/**: Directory containing the main Solidity contracts.
  - **Address.sol**: Library for address operations.
  - **MarketRegulator.sol**: Contract for market regulation.
  - **ONE.sol**: Main contract for the ONE token.
  - **ONEDividendTracker.sol**: Contract for tracking and distributing dividends.
- **interfaces/**: Directory containing interface contracts.
  - **IFactory.sol**: Interface for factory contract.
  - **IRouter.sol**: Interface for router contract.
- **scripts/zip_project.py**: Python script for zipping the project.

## Getting Started

### Prerequisites

- Node.js
- npm
- Solidity compiler

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/1ONE.git
    cd 1ONE-main
    ```

2. Install the necessary dependencies:

    ```bash
    npm install
    ```

3. Compile the contracts:

    ```bash
    npx hardhat compile
    ```

### Usage

1. Deploy the contracts:

    ```bash
    npx hardhat run scripts/deploy.js
    ```

2. Interact with the contracts using `TheONECoin.js`.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
