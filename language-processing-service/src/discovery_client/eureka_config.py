from py_eureka_client import eureka_client


async def register_with_eureka():
    """
    Register service với Eureka server. 
    """
    await eureka_client.init_async(
        eureka_server="http://localhost:8761/eureka/",
        app_name="language-processing-service",
        instance_port=8089,
        instance_host="localhost",
        health_check_url="http://localhost:8089/health",
        status_page_url="http://localhost:8089/info",
        data_center_name="MyOwn",
    )
