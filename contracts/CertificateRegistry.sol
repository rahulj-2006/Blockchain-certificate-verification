// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertificateRegistry
 * @dev Role-based certificate registry:
 *   - superAdmin (owner): full control, can add/remove admins, revoke any cert
 *   - admins: can issue certificates
 *   - public: can verify for free, read-only
 */
contract CertificateRegistry {
    address public owner;

    mapping(address => bool) public admins;

    struct Certificate {
        bool isValid;
        address issuer;
        uint256 timestamp;
    }

    mapping(bytes32 => Certificate) public certificates;

    event CertificateIssued(bytes32 indexed certificateHash, address indexed issuer, uint256 timestamp);
    event CertificateRevoked(bytes32 indexed certificateHash, address indexed revoker);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    modifier onlyOwner() {
        require(msg.sender == owner, "Super Admin only");
        _;
    }

    modifier onlyAdminOrOwner() {
        require(admins[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true; // Owner is also an admin
    }

    /* ─── Super Admin ─── */

    function addAdmin(address _admin) public onlyOwner {
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) public onlyOwner {
        require(_admin != owner, "Cannot remove owner");
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    /* ─── Admin ─── */

    function issueCertificate(bytes32 _certificateHash) public onlyAdminOrOwner {
        require(!certificates[_certificateHash].isValid, "Certificate already registered");
        certificates[_certificateHash] = Certificate({
            isValid: true,
            issuer: msg.sender,
            timestamp: block.timestamp
        });
        emit CertificateIssued(_certificateHash, msg.sender, block.timestamp);
    }

    /* ─── Super Admin / Issuer ─── */

    function revokeCertificate(bytes32 _certificateHash) public {
        Certificate storage cert = certificates[_certificateHash];
        require(cert.isValid, "Not registered or already revoked");
        require(msg.sender == cert.issuer || msg.sender == owner, "Not authorized");
        cert.isValid = false;
        emit CertificateRevoked(_certificateHash, msg.sender);
    }

    /* ─── Public (free, read-only) ─── */

    function verifyCertificate(bytes32 _certificateHash) public view returns (
        bool isValid, address issuer, uint256 timestamp
    ) {
        Certificate memory cert = certificates[_certificateHash];
        return (cert.isValid, cert.issuer, cert.timestamp);
    }
}
