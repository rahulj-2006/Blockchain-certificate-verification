// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  CertChain — Multi-Tenant Blockchain Certificate Registry
 * @author CertChain Team
 * @notice Production-ready certificate issuance & verification system.
 *         Designed for deployment on Ethereum Sepolia testnet.
 *
 * Architecture:
 *   Super Admin (UGC / Deployer)
 *       └── Verifies Universities
 *               └── Universities Issue Certificates
 *                       └── Anyone Can Verify Certificates (public)
 */
contract CertChain {

    // =========================================================
    //  ENUMS
    // =========================================================

    /// @notice Accreditation types recognised by the system.
    enum AccreditationType { UGC, IIT, NIT, Private, Other }

    /// @notice Lifecycle states of a university in the system.
    enum UniversityStatus { Pending, Verified, Deactivated }

    // =========================================================
    //  STRUCTS
    // =========================================================

    /**
     * @notice Represents a registered university.
     * @param wallet          Current wallet address (can be updated by super admin).
     * @param name            Official university name.
     * @param domain          Official domain (e.g. jainuniversity.ac.in).
     * @param accreditation   Accreditation body / type.
     * @param status          Current verification status.
     * @param registeredAt    Block timestamp of registration.
     * @param verifiedAt      Block timestamp of verification (0 if not verified).
     */
    struct University {
        address wallet;
        string  name;
        string  domain;
        AccreditationType accreditation;
        UniversityStatus  status;
        uint256 registeredAt;
        uint256 verifiedAt;
    }

    /**
     * @notice Represents an issued certificate.
     * @param certificateHash   Keccak256 hash of the certificate data (unique ID).
     * @param studentName       Full name of the student.
     * @param courseName        Degree / course awarded.
     * @param issueDate         Date of issue stored as a unix timestamp.
     * @param issuingUniversity Wallet address of the issuing university (at time of issue).
     * @param isRevoked         True if this certificate has been revoked.
     * @param issuedAt          Block timestamp when the certificate was recorded on-chain.
     */
    struct Certificate {
        bytes32 certificateHash;
        string  studentName;
        string  courseName;
        uint256 issueDate;
        address issuingUniversity;
        bool    isRevoked;
        uint256 issuedAt;
    }

    // =========================================================
    //  STATE VARIABLES
    // =========================================================

    /// @notice The super admin (UGC / contract deployer). Immutable after deployment.
    address public immutable superAdmin;

    /**
     * @notice Primary university registry.
     *         Maps the university's CURRENT wallet → University struct.
     *         Updated on wallet recovery.
     */
    mapping(address => University) private universities;

    /**
     * @notice Tracks which wallet addresses are currently registered as universities.
     *         Used to prevent duplicate registrations.
     */
    mapping(address => bool) private isRegistered;

    /**
     * @notice Certificate registry.
     *         Maps certificateHash → Certificate struct.
     */
    mapping(bytes32 => Certificate) private certificates;

    /**
     * @notice Tracks certificates issued per university.
     *         Maps university wallet → array of certificate hashes.
     *         Useful for audits and listing a university's certificates.
     */
    mapping(address => bytes32[]) private universityCertificates;

    /**
     * @notice Tracks old wallet → new wallet for wallet recovery history.
     *         Allows off-chain lookup of a university's certificate history
     *         even after a wallet update.
     */
    mapping(address => address) public walletMigrationHistory;

    // =========================================================
    //  EVENTS
    // =========================================================

    /// @notice Emitted when a university submits a registration request.
    event UniversityRegistered(
        address indexed wallet,
        string  name,
        string  domain,
        AccreditationType accreditation,
        uint256 timestamp
    );

    /// @notice Emitted when the super admin verifies a university.
    event UniversityVerified(
        address indexed wallet,
        string  name,
        uint256 timestamp
    );

    /// @notice Emitted when the super admin deactivates a university.
    event UniversityDeactivated(
        address indexed wallet,
        string  name,
        uint256 timestamp
    );

    /// @notice Emitted when a verified university issues a certificate.
    event CertificateIssued(
        bytes32 indexed certificateHash,
        address indexed issuingUniversity,
        string  studentName,
        string  courseName,
        uint256 issueDate,
        uint256 timestamp
    );

    /// @notice Emitted when a university revokes one of its own certificates.
    event CertificateRevoked(
        bytes32 indexed certificateHash,
        address indexed revokedBy,
        uint256 timestamp
    );

    /// @notice Emitted when the super admin updates a university's wallet address.
    event WalletUpdated(
        address indexed oldWallet,
        address indexed newWallet,
        string  universityName,
        uint256 timestamp
    );

    // =========================================================
    //  MODIFIERS
    // =========================================================

    /// @dev Restricts function access to the super admin only.
    modifier onlySuperAdmin() {
        require(msg.sender == superAdmin, "CertChain: caller is not the super admin");
        _;
    }

    /**
     * @dev Restricts function access to verified universities only.
     *      The caller's wallet must be registered AND in Verified status.
     */
    modifier onlyVerifiedUniversity() {
        require(isRegistered[msg.sender], "CertChain: university not registered");
        require(
            universities[msg.sender].status == UniversityStatus.Verified,
            "CertChain: university not verified"
        );
        _;
    }

    // =========================================================
    //  CONSTRUCTOR
    // =========================================================

    /**
     * @notice Deploys the contract and sets the deployer as super admin.
     * @dev    The super admin address is stored as immutable — it can never change.
     */
    constructor() {
        superAdmin = msg.sender;
    }

    // =========================================================
    //  UNIVERSITY REGISTRATION
    // =========================================================

    /**
     * @notice Registers a university for review by the super admin.
     * @dev    The calling wallet becomes the university's identity on-chain.
     *         Status is set to Pending until the super admin verifies it.
     *
     * @param _name           Official university name (non-empty).
     * @param _domain         Official email/web domain (non-empty).
     * @param _accreditation  Accreditation type as uint8 (0=UGC,1=IIT,2=NIT,3=Private,4=Other).
     */
    function registerUniversity(
        string calldata _name,
        string calldata _domain,
        AccreditationType _accreditation
    ) external {
        require(!isRegistered[msg.sender], "CertChain: wallet already registered");
        require(msg.sender != superAdmin,  "CertChain: super admin cannot register as university");
        require(bytes(_name).length > 0,   "CertChain: university name cannot be empty");
        require(bytes(_domain).length > 0, "CertChain: domain cannot be empty");

        universities[msg.sender] = University({
            wallet:        msg.sender,
            name:          _name,
            domain:        _domain,
            accreditation: _accreditation,
            status:        UniversityStatus.Pending,
            registeredAt:  block.timestamp,
            verifiedAt:    0
        });

        isRegistered[msg.sender] = true;

        emit UniversityRegistered(msg.sender, _name, _domain, _accreditation, block.timestamp);
    }

    // =========================================================
    //  SUPER ADMIN — UNIVERSITY MANAGEMENT
    // =========================================================

    /**
     * @notice Verifies a registered university so it can issue certificates.
     * @dev    Only callable by super admin. University must be in Pending status.
     *
     * @param _universityWallet The wallet address of the university to verify.
     */
    function verifyUniversity(address _universityWallet) external onlySuperAdmin {
        require(isRegistered[_universityWallet],  "CertChain: university not registered");
        require(
            universities[_universityWallet].status == UniversityStatus.Pending,
            "CertChain: university is not in Pending status"
        );

        universities[_universityWallet].status     = UniversityStatus.Verified;
        universities[_universityWallet].verifiedAt = block.timestamp;

        emit UniversityVerified(
            _universityWallet,
            universities[_universityWallet].name,
            block.timestamp
        );
    }

    /**
     * @notice Deactivates a university, preventing future certificate issuance.
     * @dev    Only callable by super admin. Already-issued certificates are NOT affected.
     *         Deactivated universities can be re-verified if needed.
     *
     * @param _universityWallet The wallet address of the university to deactivate.
     */
    function deactivateUniversity(address _universityWallet) external onlySuperAdmin {
        require(isRegistered[_universityWallet], "CertChain: university not registered");
        require(
            universities[_universityWallet].status != UniversityStatus.Deactivated,
            "CertChain: university is already deactivated"
        );

        universities[_universityWallet].status = UniversityStatus.Deactivated;

        emit UniversityDeactivated(
            _universityWallet,
            universities[_universityWallet].name,
            block.timestamp
        );
    }

    /**
     * @notice Re-verifies a previously deactivated university.
     * @dev    Only callable by super admin.
     *
     * @param _universityWallet The wallet address of the university to re-activate.
     */
    function reactivateUniversity(address _universityWallet) external onlySuperAdmin {
        require(isRegistered[_universityWallet], "CertChain: university not registered");
        require(
            universities[_universityWallet].status == UniversityStatus.Deactivated,
            "CertChain: university is not deactivated"
        );

        universities[_universityWallet].status = UniversityStatus.Verified;

        emit UniversityVerified(
            _universityWallet,
            universities[_universityWallet].name,
            block.timestamp
        );
    }

    // =========================================================
    //  WALLET RECOVERY (SUPER ADMIN)
    // =========================================================

    /**
     * @notice Migrates a university's identity from a compromised/lost wallet to a new one.
     * @dev    Only callable by super admin.
     *         - The new wallet must NOT already be registered.
     *         - All certificates remain stored under the OLD wallet address
     *           (issuingUniversity field is historical and immutable).
     *         - The university struct is moved to the new wallet key.
     *         - walletMigrationHistory records old → new for off-chain tracking.
     *
     * @param _oldWallet The compromised/lost university wallet address.
     * @param _newWallet The new replacement wallet address.
     */
    function updateUniversityWallet(
        address _oldWallet,
        address _newWallet
    ) external onlySuperAdmin {
        require(_newWallet != address(0),   "CertChain: new wallet cannot be zero address");
        require(_newWallet != _oldWallet,   "CertChain: new wallet must differ from old wallet");
        require(isRegistered[_oldWallet],   "CertChain: old wallet not registered");
        require(!isRegistered[_newWallet],  "CertChain: new wallet is already registered");

        // Copy university struct to new wallet key
        University memory uni = universities[_oldWallet];
        uni.wallet = _newWallet;
        universities[_newWallet] = uni;

        // Transfer the certificate list to the new wallet key
        universityCertificates[_newWallet] = universityCertificates[_oldWallet];

        // Revoke old wallet registration
        isRegistered[_oldWallet]  = false;
        isRegistered[_newWallet]  = true;

        // Record migration history
        walletMigrationHistory[_oldWallet] = _newWallet;

        // Clean up old wallet storage
        delete universities[_oldWallet];
        delete universityCertificates[_oldWallet];

        emit WalletUpdated(_oldWallet, _newWallet, uni.name, block.timestamp);
    }

    // =========================================================
    //  CERTIFICATE ISSUANCE
    // =========================================================

    /**
     * @notice Issues a certificate on-chain. Callable only by verified universities.
     * @dev    Reverts if the same certificateHash has already been issued (idempotency guard).
     *
     * @param _certificateHash  Keccak256 hash of the certificate data (32 bytes).
     * @param _studentName      Full name of the student.
     * @param _courseName       Degree / course awarded.
     * @param _issueDate        Date of issue as a unix timestamp.
     */
    function issueCertificate(
        bytes32 _certificateHash,
        string  calldata _studentName,
        string  calldata _courseName,
        uint256 _issueDate
    ) external onlyVerifiedUniversity {
        require(
            certificates[_certificateHash].issuedAt == 0,
            "CertChain: certificate already issued"
        );
        require(_certificateHash != bytes32(0),    "CertChain: invalid certificate hash");
        require(bytes(_studentName).length > 0,    "CertChain: student name cannot be empty");
        require(bytes(_courseName).length > 0,     "CertChain: course name cannot be empty");
        require(_issueDate > 0,                    "CertChain: issue date cannot be zero");

        certificates[_certificateHash] = Certificate({
            certificateHash:    _certificateHash,
            studentName:        _studentName,
            courseName:         _courseName,
            issueDate:          _issueDate,
            issuingUniversity:  msg.sender,
            isRevoked:          false,
            issuedAt:           block.timestamp
        });

        universityCertificates[msg.sender].push(_certificateHash);

        emit CertificateIssued(
            _certificateHash,
            msg.sender,
            _studentName,
            _courseName,
            _issueDate,
            block.timestamp
        );
    }

    // =========================================================
    //  CERTIFICATE REVOCATION
    // =========================================================

    /**
     * @notice Revokes a certificate. Only the issuing university can revoke its own certs.
     * @dev    Revocation is permanent — the certificate remains on-chain but marked revoked.
     *
     * @param _certificateHash The hash of the certificate to revoke.
     */
    function revokeCertificate(bytes32 _certificateHash) external onlyVerifiedUniversity {
        Certificate storage cert = certificates[_certificateHash];

        require(cert.issuedAt != 0,              "CertChain: certificate does not exist");
        require(!cert.isRevoked,                  "CertChain: certificate already revoked");
        require(
            cert.issuingUniversity == msg.sender,
            "CertChain: only the issuing university can revoke this certificate"
        );

        cert.isRevoked = true;

        emit CertificateRevoked(_certificateHash, msg.sender, block.timestamp);
    }

    // =========================================================
    //  PUBLIC VERIFICATION
    // =========================================================

    /**
     * @notice Verifies a certificate by its hash. Fully public — no login required.
     * @dev    Returns all certificate fields plus:
     *         - `isValid`: true only if the cert exists AND is NOT revoked.
     *         - University name and domain for display purposes.
     *
     * @param _certificateHash The hash to verify.
     * @return studentName         Student's full name.
     * @return courseName          Degree / course name.
     * @return issueDate           Date of issue (unix timestamp).
     * @return issuingUniversity   Wallet address of the issuing university.
     * @return universityName      Name of the issuing university.
     * @return universityDomain    Domain of the issuing university.
     * @return isRevoked           Whether the certificate has been revoked.
     * @return isValid             True if certificate exists and is not revoked.
     * @return issuedAt            Block timestamp when the cert was recorded on-chain.
     */
    function verifyCertificate(bytes32 _certificateHash)
        external
        view
        returns (
            string  memory studentName,
            string  memory courseName,
            uint256        issueDate,
            address        issuingUniversity,
            string  memory universityName,
            string  memory universityDomain,
            bool           isRevoked,
            bool           isValid,
            uint256        issuedAt
        )
    {
        Certificate storage cert = certificates[_certificateHash];

        require(cert.issuedAt != 0, "CertChain: certificate not found");

        // Fetch university details from the issuing wallet
        // Note: if wallet was migrated, we look at the historical issuingUniversity
        // stored in the cert, which may now be the old wallet. We also check
        // the migration history to get the new wallet's university data if needed.
        address uniWallet = cert.issuingUniversity;
        University storage uni = universities[uniWallet];

        // If university was migrated and no longer in registry under old address,
        // attempt to resolve via migration history
        if (!isRegistered[uniWallet] && walletMigrationHistory[uniWallet] != address(0)) {
            uni = universities[walletMigrationHistory[uniWallet]];
        }

        return (
            cert.studentName,
            cert.courseName,
            cert.issueDate,
            cert.issuingUniversity,
            uni.name,
            uni.domain,
            cert.isRevoked,
            !cert.isRevoked,   // isValid = exists AND not revoked
            cert.issuedAt
        );
    }

    // =========================================================
    //  READ FUNCTIONS — UNIVERSITIES
    // =========================================================

    /**
     * @notice Returns the full profile of a university by wallet address.
     * @param _wallet The university's current wallet address.
     */
    function getUniversity(address _wallet)
        external
        view
        returns (University memory)
    {
        require(isRegistered[_wallet], "CertChain: university not registered");
        return universities[_wallet];
    }

    /**
     * @notice Returns the verification status of a university.
     * @param _wallet The university's wallet address.
     * @return status  0=Pending, 1=Verified, 2=Deactivated
     */
    function getUniversityStatus(address _wallet)
        external
        view
        returns (UniversityStatus status)
    {
        require(isRegistered[_wallet], "CertChain: university not registered");
        return universities[_wallet].status;
    }

    /**
     * @notice Returns all certificate hashes issued by a university.
     * @dev    Use this to enumerate a university's certificates off-chain.
     * @param _universityWallet The university wallet address.
     */
    function getUniversityCertificates(address _universityWallet)
        external
        view
        returns (bytes32[] memory)
    {
        return universityCertificates[_universityWallet];
    }

    // =========================================================
    //  READ FUNCTIONS — CERTIFICATES
    // =========================================================

    /**
     * @notice Checks whether a certificate hash has already been issued.
     * @param _certificateHash The hash to check.
     * @return True if the certificate exists on-chain.
     */
    function certificateExists(bytes32 _certificateHash)
        external
        view
        returns (bool)
    {
        return certificates[_certificateHash].issuedAt != 0;
    }

    /**
     * @notice Returns raw certificate data without the validity logic.
     * @dev    Useful for admin dashboards that need the raw struct.
     * @param _certificateHash The hash of the certificate.
     */
    function getCertificate(bytes32 _certificateHash)
        external
        view
        returns (Certificate memory)
    {
        require(
            certificates[_certificateHash].issuedAt != 0,
            "CertChain: certificate not found"
        );
        return certificates[_certificateHash];
    }
}
