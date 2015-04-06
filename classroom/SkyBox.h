#include <osgViewer/Viewer>
#include <osgDB/ReadFile>
#include <osg/MatrixTransform>
#include <osg/ComputeBoundsVisitor>

#include <osg/Camera>
#include <osgGA/KeySwitchMatrixManipulator>
#include <osgGA/TrackballManipulator>
#include <osgGA/NodeTrackerManipulator>


#include <osg/Depth>
#include <osg/TexGen>
#include <osg/TextureCubeMap>
#include <osg/ShapeDrawable>
#include <osg/Geode>
#include <osgDB/ReadFile>
#include <osgUtil/CullVisitor>

class SkyBox : public osg::Transform
{
public:
	SkyBox();

	SkyBox(const SkyBox& copy, osg::CopyOp copyop = osg::CopyOp::SHALLOW_COPY)
		: osg::Transform(copy, copyop) {}

	META_Node(osg, SkyBox);

	void setEnvironmentMap(unsigned int unit, osg::Image* posX, osg::Image* negX,
		osg::Image* posY, osg::Image* negY, osg::Image* posZ, osg::Image* negZ);

	virtual bool computeLocalToWorldMatrix(osg::Matrix& matrix, osg::NodeVisitor* nv) const;
	virtual bool computeWorldToLocalMatrix(osg::Matrix& matrix, osg::NodeVisitor* nv) const;

protected:
	virtual ~SkyBox() {}
};
